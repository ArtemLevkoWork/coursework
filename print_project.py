import os
import sys
from pathlib import Path
from typing import List, Optional, Callable, Set

# Type alias for output function
OutputFunction = Callable[[str], None]

# --- CONFIGURATION ---
# Default directory names to ignore everywhere
DEFAULT_IGNORED_NAMES = {
    '.git', '.idea', '.vscode', '__pycache__', 
    'venv', '.venv', 'env', 'node_modules', 
    '.DS_Store', 'dist', 'build'
}

def read_file_contents(file_path: Path) -> str:
    """Reads the content of a file, handling empty and binary files."""
    try:
        if file_path.stat().st_size == 0:
            return "empty file"
    except OSError:
        return "[Error accessing file]"
    
    try:
        # Try to read as a text file (UTF-8)
        return file_path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, IOError):
        try:
            # Fallback for binary files
            with file_path.open('rb') as file:
                file.read(1) 
                return "[Cannot display file content (binary file)]"
        except Exception as e:
            return f"[Error reading file: {str(e)}]"

def should_exclude(path: Path, excluded_paths: List[Path], directory_path: Path) -> bool:
    """Checks if a path should be excluded based on the provided specific paths list."""
    try:
        abs_path = path.resolve()
    except OSError:
        return True

    for excluded in excluded_paths:
        try:
            abs_excluded = excluded.resolve()
        except OSError:
            continue
        
        # Check for exact file match
        if abs_path == abs_excluded and abs_path.is_file():
            return True
        
        # Check if the path is inside an excluded directory
        if abs_excluded.is_dir():
            if abs_path == abs_excluded or abs_path.is_relative_to(abs_excluded):
                return True

    return False

def print_directory_structure(directory_path: Path, excluded_paths: List[Path], ignored_names: Set[str], output_func: OutputFunction):
    """Prints the directory structure with indentation."""
    for root_str, dirs, files in os.walk(directory_path):
        root = Path(root_str)
        
        # Filter directories in place to prevent recursion into ignored folders
        dirs[:] = [
            d for d in dirs 
            if not d.startswith('.') and 
               d not in ignored_names and
               not should_exclude(root / d, excluded_paths, directory_path)
        ]
        
        try:
            relative_path = root.relative_to(directory_path)
            level = len(relative_path.parts)
        except ValueError:
            level = 0

        indent = ' ' * 4 * level
        
        if should_exclude(root, excluded_paths, directory_path):
            continue
            
        output_func(f"{indent}{root.name}/")
        
        sub_indent = ' ' * 4 * (level + 1)
        for file in files:
            file_path = root / file
            # Check basic exclusion and name exclusion logic for files if needed, 
            # usually files don't have 'directory names', but we check excluded paths.
            if not should_exclude(file_path, excluded_paths, directory_path):
                output_func(f"{sub_indent}{file}")

def process_directory(directory_path: Path, excluded_paths: List[Path], ignored_names: Set[str], output_func: OutputFunction):
    """Walks the directory, prints structure, and outputs file contents."""
    
    output_func(f"[{directory_path}] structure:")
    print_directory_structure(directory_path, excluded_paths, ignored_names, output_func)
    output_func("-" * 50)
    
    for root_str, dirs, files in os.walk(directory_path):
        root = Path(root_str)
        
        # Filter directories in place (same logic as structure printing)
        dirs[:] = [
            d for d in dirs 
            if not d.startswith('.') and 
               d not in ignored_names and
               not should_exclude(root / d, excluded_paths, directory_path)
        ]
        
        if should_exclude(root, excluded_paths, directory_path):
            continue
            
        for file in files:
            file_path = root / file
            
            if should_exclude(file_path, excluded_paths, directory_path):
                continue
            
            output_func(f"\n[{file_path}]:")
            output_func(read_file_contents(file_path))
            output_func("---")

def main():
    """Main execution function."""
    args = sys.argv[1:]
    output_file_path: Optional[Path] = None
    
    # Defaults
    ignored_names = set(DEFAULT_IGNORED_NAMES)
    directory_path: Optional[Path] = None
    excluded_paths: List[Path] = []

    # --- Argument Parsing (Manual) ---
    try:
        # 1. Parse Output File (-f)
        if '-f' in args:
            f_index = args.index('-f')
            if f_index + 1 < len(args) and not args[f_index + 1].startswith('-'):
                output_file_path = Path(args[f_index + 1])
                args.pop(f_index + 1)
                args.pop(f_index)
            else:
                args.pop(f_index) # Just flag provided, use default name later

        # 2. Parse Ignored Directory Names (-i)
        if '-i' in args:
            i_index = args.index('-i')
            args.pop(i_index) # Remove the flag
            # Consume arguments until the end or next flag (though we only expect paths after this usually)
            # To be safe, we consume until we run out of args or hit something that looks like a flag if we added more flags later.
            # For now, we assume users put -i [names...] then [excluded_paths...] could get mixed.
            # STRATEGY: Treat consecutive non-path-looking args as names? 
            # SIMPLER STRATEGY: Any arg immediately following -i until the end of list 
            # OR until we find valid paths. 
            # Let's use a while loop to consume 'names'.
            
            while i_index < len(args):
                val = args[i_index]
                # Heuristic: if it looks like a path (contains separator), stop consuming as name?
                # Or just consume everything? The original script assumed remaining args are paths.
                # Let's assume names don't have separators usually.
                if os.sep in val or '/' in val or val == '.':
                    break
                ignored_names.add(val)
                args.pop(i_index)

        # 3. Parse Directory and Excluded Paths
        if not args:
            print("Usage: python script.py <directory_path> [-f [output_file]] [-i name1 name2] [excluded_paths...]")
            sys.exit(1)
            
        directory_path = Path(args[0])
        excluded_paths = [Path(p) for p in args[1:]]
        
    except Exception as e:
        print(f"Error parsing arguments: {e}")
        sys.exit(1)

    if not directory_path.is_dir():
        print(f"Error: {directory_path} is not a directory")
        sys.exit(1)
    
    # --- Execution Logic ---
    
    # Case 1: Output to FILE
    if output_file_path is not None or ('-f' in sys.argv):
        if output_file_path is None:
            output_file_path = Path(f"{directory_path.name}.txt")
            
        print(f"Output will be saved to: {output_file_path}")
        
        try:
            with output_file_path.open('w', encoding='utf-8') as f:
                def file_output(text: str):
                    f.write(text + '\n')
                
                # Write header info
                info_header = []
                if excluded_paths:
                    info_header.append(f"Excluded paths: {', '.join(str(p) for p in excluded_paths)}")
                if ignored_names != DEFAULT_IGNORED_NAMES:
                    # Only show custom ignored names to reduce noise
                    custom_ignored = ignored_names - DEFAULT_IGNORED_NAMES
                    if custom_ignored:
                        info_header.append(f"Ignored dir names: {', '.join(custom_ignored)}")
                
                if info_header:
                    for line in info_header:
                        file_output(line)
                    file_output("-" * 50)
                
                process_directory(directory_path, excluded_paths, ignored_names, file_output)
                
            print("Done.")
            
        except IOError as e:
            print(f"Error writing to file: {e}")

    # Case 2: Output to CONSOLE
    else:
        def console_output(text: str):
            print(text)
            
        if excluded_paths:
            console_output(f"Excluded paths: {', '.join(str(p) for p in excluded_paths)}")
            console_output("-" * 50)
            
        process_directory(directory_path, excluded_paths, ignored_names, console_output)

if __name__ == "__main__":
    main()