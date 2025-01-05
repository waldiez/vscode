# @waldiez/vscode

A waldiez extension for Visual Studio Code.

<!--markdownlint-disable MD033-->
<img src="https://raw.githubusercontent.com/waldiez/vscode/refs/heads/main/public/overview.webp" alt="Waldiez Overview" width="100%">

## Features

- [x] Visualize .waldiez files
- [x] Load existing .waldiez flows
- [x] Convert .waldiez flows to .py scripts or .ipynb notebooks
- [x] Handle uploaded files in .waldiez flows (for RAG)
- [x] Run .waldiez flows using a compatible python interpreter

## Requirements

- Visual Studio Code v1.95.0 or later
- Python >= 3.10, < 3.13 (for converting and/or running .waldiez flows)
- Vscode Python [Extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python)

## Known Conflicts

- **autogen-agentchat**: This package conflicts with `ag2` / `pyautogen`. Ensure that `autogen-agentchat` is not installed before installing `waldiez`. If you have already installed `autogen-agentchat`, you can uninstall it with:

    ```shell
    python3 -m pip uninstall -y autogen-agentchat
    # if you are sure which pip is being used:
    # pip uninstall -y autogen-agentchat
    # to find the path of the current python interpreter:
    # python3 -c "import sys; print(sys.executable)"
    # in a jupyter notebook this would be:
    # import sys
    # !{sys.executable} -m pip uninstall -y autogen-agentchat
    ```

    If already installed waldiez, you might need to reinstall it after uninstalling `autogen-agentchat`:

    ```shell
    python3 -m pip install --force --no-cache waldiez pyautogen
    # if you are sure which pip is being used:
    # pip install --force --no-cache waldiez
    # to find the path of the current python interpreter:
    # python3 -c "import sys; print(sys.executable)"
    # in a jupyter notebook this would be:
    # import sys
    # !{sys.executable} -m pip install --force --no-cache waldiez pyautogen
    ```

Generally, a new virtual environment is recommended to avoid conflicts:

```shell
python3 -m venv .venv
## Linux / macOS:
# source .venv/bin/activate
## Windows:
## In cmd.exe
# venv\Scripts\activate.bat
## In PowerShell
# venv\Scripts\Activate.ps1
```

## License

This project is licensed under the [Apache License, Version 2.0 (Apache-2.0)](https://github.com/waldiez/vscode/blob/main/LICENSE).
