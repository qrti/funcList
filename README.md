# FuncList
Retrieves functions, symbols, bookmarks from text or source files and lists references in a side editor. Clicking a references will reveal the corresponding position in text or source file.

**New Version** -> [History](#history)  
reworked virtual document handling

**Change of Behavior**  
source files can't have multiple reference lists anymore  
only temporary lists with slanted (tab) titles are updated correctly

### Short Test Drive
- open a source file (.c .h .cpp .hpp .ts .php .ps1 .asm)
- select `F1 > Show Functions`
- a side editor opens and shows a reference list
- click a reference

![funclist in action](images/funcList.gif)

# Settings
`extensions`  
list of file extension strings

`native`  
regular expression to match functions, symbols, bookmarks  
_(native does not allow regEx groups)_

`display`  
regular expression to trim matches of nativeFilter for clean display  
_(display allows regEx groups 0-9 in options, see examples)_

`sort`  
0 = unsorted, order of appearance (appear)  
1 = sorted, ignore case (nocase)  
2 = sorted, obey case (case)

`doubleSpacing`  
extended space in symbol list  
false = off  
true = on

**Settings should look like this**

    "funcList": {
        "doubleSpacing": false,
        
        "filters": [
            {
                "extensions": [
                    ".c",
                    ".h"
                ],
                "native": "/^[a-z]+\\s+\\w+\\(/mgi",
                "display": "/\\S* +(\\w+)/1",
                "sort": 0
            },
            {
                ...
            }
        ]
    }

**Add your own filetypes and filters**  
\- open settings with 'Menu/File/Preferences/Settings'  
\- enter funcList in the search field  
\- choose User or Workspace Settings  
\- click 'Edit in settings.json'  
\- place the cursor to a fitting place  
\- type funcList and hit enter to insert predefined settings  
\- edit them after your needs  
\- check for correct bracing and commas  
\- see -> [Hints](#hints) for easy regEx testing

# Examples
### TypeScript/Php Function Filter

    "native": "/(?:^|\\s)function\\s+\\w+\\(/mg"

`function encodeLocation(`  
`function dispose(`  
simple functions will be found

    "display": "/\\s*function\\s+(\\w+)/1"

`encodeLocation`  
`dispose`  
function names without keyword and opening bracket will be displayed  

_(Thanks to Avol-V)_

### Simple C Function Filter

    "native": "/^[a-z]+\\s+\\w+\\(/mgi"

or  

    "native": "/^[a-z]+\\s+.*{][)$/img"

_(Thanks to sungoth)_

`int main(`  
`void initSerial(`  
simple function headers will be found

    "display": "/\\S* +(\\w+)/1"

`main`  
`initSerial`  
function names without return value and opening bracket will be displayed

### Assembler Target Filter

    "native": "/^\\w+:\\s*$/mg"

`encodeByte:`  
`doSleep:`  
standalone targets on beginning of lines are found

`mar01: mov r0,r1`  
`abc17: ;comment`  
targets with following instruction or comment are not found

    "display": "/\\w+/"
    
`encodeByte`  
`doSleep`  
targets are listed without colon or trailing spaces

### Python Function Filter

    "native": "/(?:^def|^class|^\\s+def|^\\s+class)\\s\\w+\\s*\\((?:\\s*|\\w+|[\\w\\*,\\s\\'\"=\\(\\)\\{\\}\\[\\]\\/\\.]+)\\):/img"
    "display": "/.*\\)/"

_(Thanks to Derek)_

### PowerShell Function Filter

    "native": "/function\\s+\\w+-?\\w*\\s*{/img"  
    "display": "/function\\s+(\\w+-?\\w*)/1i"

_(Thanks to Paradox355)_

### Bookmark Filter

    "native": "/^bookmark .+$/mg"

`bookmark my mark 123`  
`bookmark huubaBooba`  
or similar will be found

    "display": "/\\w+\\s+(.*\\w)/1"

`my mark 123`  
`huubaBooba`  
will be listed

# Hints
 
- to show pure results of native filter use  
  `"display": "/.*/"`
- reference lists contribute two context menu entries  
  _'Switch Sort'_ for switching sort modes  
  _'Refresh'_ for manual refreshing the reference list
- reference list tab names are surrounded by brackets
- reference lists are read only and can't be saved
- multiple found references are marked with bracketed numbers  
  selectable with consecutive clicks  
- easy testing with online regEx engines  
  for example [regex101.com](https://regex101.com)  
  (omit regEx groups in display filter for testing)  
- settings from previous versions can be deleted  
  `"funcList.xxx": "xxx"`

# History
- __V0.5__  
  based on document content provider  
  reference lists are read only and have to be closed and reopened for refresh and therefore loose user set width 
- __V0.6__  
  based on untitled file scheme  
  reference lists are editable and refresh keeps user set width
- __V0.6.1__  
  strip CR/LF from native filter to resolve [Issue 1](https://github.com/qrti/funcList/issues/1)  
  example for TypeScript filter  
  revised examples
- __V7.0.0__  
  back to (improved) document content provider  
  reference lists are read only and keep user set width  
  no side effects when closing document or vscode  

- __V7.1.0__  
  new option 'doubleSpacing' -> [Settings](#settings)  
  fixed CR/LF bug for Unix/Linux/MacOS documents, addresses again [Issue 1](https://github.com/qrti/funcList/issues/1)

- __V7.1.1__  
  new example filter for PowerShell functions -> [Examples](#powershell-function-filter)

- __V7.2.1__  
  new sort options -> [Settings](#settings)  
  Linux/Mac path bug fix  
  corrected symbol match

- __V7.3.0__  
   file extension aware filters  
   5 predefined filters

- __V7.3.1__  
    updated readme

- __V7.6.2__  
    reworked virtual document handling

- __V7.6.3__  
    additional simple C- and new Python-Filter added to documentation

# How to run locally
- `npm run compile`  
to start the compiler in watch mode
- open this folder in vsCode and press `F5`
