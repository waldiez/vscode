# @waldiez/vscode

A waldiez extension for Visual Studio Code.

<!--markdownlint-disable MD033-->
<img src="https://raw.githubusercontent.com/waldiez/vscode/refs/heads/main/public/overview.webp" alt="Waldiez Overview" width="100%">

## Features

- [x] Visualize .waldiez files
- [x] Load existing .waldiez flows
- [x] Convert .waldiez flows to .py scripts or .ipynb notebooks
- [x] Handle uploaded files in .waldiez flows (for RAG)
- [ ] Run .waldiez flows using a compatible python interpreter

## Requirements

- Visual Studio Code v1.95.0 or later
- Python >= 3.10, < 3.13 (for converting and/or running .waldiez flows)
- Vscode Python [Extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python)

## Installation

The extension is still a work in progress and is not yet available in the Visual Studio Code marketplace. To build and install the extension locally, follow the instructions below.

1. Clone the repository
2. Run `yarn install` to install the dependencies
3. Run `yarn build` to build the extension. It should generate waldiez-vscode-x.y.z.vsix in the root directory
4. Install the extension by running `code --install-extension waldiez-vscode-x.y.z.vsix` or:
   - Go to the Extensions view.
   - Click Views and More Actions (or the ... icon) and select Install from VSIX....

After uninstalling the extension, to cleanup everything you can remove the extension files (waldiez.* folder) from the extensions directory. The extensions directory is located at:

- Windows: %USERPROFILE%\.vscode\extensions
- macOS: ~/.vscode/extensions
- Linux: ~/.vscode/extensions

Reference: <https://code.visualstudio.com/api/working-with-extensions/publishing-extension#packaging-extensions>
