# fsc-suite
The FSC-suite script is a collection of tools that is to be used on-top of an existing FreshService instance.

## Setup Instructions
1. Contact local IT to have them install Python 3.6+ on your profile on your local machine.
   
2. Download the zip archive of the application from GitHub (_you're here now!_)
![Screenshot of a comment on a GitHub issue showing an image, added in the Markdown, of an Octocat smiling and raising a tentacle.](static/assets/images/download_instructions.jpg)

3. Move the downloaded zip file to a directory of your preference and unzip it.
   
4. Install dependencies
   
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**Note:** _It is best to run this script in a local virtual environment.  If you are comfortable, please skip this step._

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;In your terminal, navigate to the root directory folder of the unzipped download.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**Note:** _You may have to run the commands as pip3 vs. pip._

### Windows
```
py -m pip install --upgrade pip
```
```
py -m pip install requests
```
```
py -m pip install flask
```

### Mac & Linux
```
pip install --upgrade pip
```
```
pip install requests
```
```
pip install flask
```

# Run instructions 
Please find the appropriate situation and follow the instructions.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**1** If you do not have an API_KEY to run this application, contact your local CBTS or TAM leader.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**2** Depending on your environment setup, you may have to run _pip3_ & _python3_ vs. _pip_ & _python_



### Virtual environment Windows
1. In your command prompt, navigate to the root directory folder of FSC Suite
2. Run the following commands in your command prompt:

```
python -m venv venv
```
```
venv\Scripts\activate
```
```
py -m pip install --upgrade pip
```
```
py -m pip install flask
```
```
py -m pip install requests
```
```
python app.py
```

3. Enter your API key

4. Open your browser and enter the following url: http://127.0.0.1:5000/



### Virtual environment Mac & Linux
1. In your terminal, navigate to the root directory folder of FSC Suite
2. Run the following commands in your terminal:
```
python -m venv venv
```
```
source venv/bin/activate
```
```
pip install --upgrade pip
```
```
pip install flask
```
```
pip install requests
```
```
python app.py
```
3. Enter your API key

4. Open your browser and enter the following url: http://127.0.0.1:5000/



### No virtual environment Mac & Windows
1. In your terminal, navigate to the root directory folder of FSC Suite
2. Run the following command
```
python app.py
```
3. Enter your API key
   
4. Open your browser and enter the following url: http://127.0.0.1:5000/
