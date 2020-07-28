# Function List
Retrieves functions, symbols, bookmarks from text or source files and lists references in a side editor. Clicking a references will reveal the corresponding position in text or source file.

**New Version** -> [History](#history)  
reworked virtual document handling

**Change of Behavior**  
source files can't have multiple reference lists anymore  
only temporary lists with slanted (tab) titles are updated correctly

### Short Test Drive
- open a source file (.vb .c .h .cpp .hpp .ts .php .ps1 .asm)
- select `F1 > Show Function List`
- a side editor opens and shows a reference list
- click a reference

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
        "sort": 0,
        "filters": [
            {
                "extensions": [
                    ".c",
                    ".h"
                ],
                "native": "/^[a-z]+\\s+\\w+\\(/mgi",
                "display": "/\\S* +(\\w+)/1"
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
- __V1.0.5__  
  add supporting multiple filters and VB language support
  change the command to 'Show Function List' after pressing key F1

# How to run locally
- open this folder in vsCode and press `F5`
