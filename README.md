# FuncList

Retrieves functions, symbols, bookmarks from text or source files and lists references in a side editor. Clicking a references will reveal the corresponding position in text or source file.

- open a C source file<br>
  see [Examples](#examples) for different file settings
- select `F1 > Function List`
- a side editor opens and shows a functions reference list
- click a reference

![funclist in action](https://github.com/qrti/funclist/blob/master/funclist.gif)

# Settings
__.vscode/settings.json__

    "funcList.nativeFilter": "/^[a-z0-9_]+:\\S*$/mgi",
    "funcList.displayFilter": "/\\S* (.+)/1",
    "funcList.sortList": 1

`nativeFilter`<br>
regular expression to match functions, symbols, bookmarks

`displayFilter`<br>
regular expression to trim matches of nativeFilter for clean display

`sortList`<br>
0 = natural (order of appearance)<br>
1 = alphabetic 

_wrong formulated regular expressions may cause unpredictable display results_

# Examples

### Bookmark Filter

    "funcList.nativeFilter": "/^bookmark .+$/mgi"

`bookmark my mark 123`<br>
`bookmark huubaBooba`<br>
or similar will be found _(nativeFilter does not allow regEx groups)_

    "funcList.displayFilter": "/\\S* (.+)/1"

`my mark 123`<br>
`huubaBooba`<br>
will be listed _(displayFilter allows regEx groups 0-9 in options)_

### Simple C Function Filter

    "funcList.nativeFilter": "/^[a-z]+\\s+[a-z]+\\(/mgi"

`int main(`<br>
`void initSerial(`<br>
simple function headers will be found

    "funcList.displayFilter": "/\\S* (.+)/1"

`main`<br>
`initSerial`<br>
function names without return value and opening bracket will be displayed

### Assembler Target Filter

    "funcList.nativeFilter": "/^[a-z0-9_]+:\\S*$/mgi"

`encodeByte:`<br>
`doSleep:`<br>
standalone targets are found

`mar01: mov r0,r1`<br>
`abc17: ;comment`<br>
targets with following instruction or comment are not found

    "funcList.displayFilter": "/[^: ]+/"
    
`encodeByte`<br>
`doSleep`<br>
targets are listed without colon

# Hints

- reference lists contribute two context menu entries<br>
  _'Switch Sort'_ for switching sort mode<br>
  _'Refresh'_ for manual refreshing the reference list
- reference list tab names are surrounded by brackets
- reference lists are read only
- multiple found references are marked with bracketed numbers<br>
  they are selectable with consecutive clicks  
- multiple lists can exist for one source file

# How to run locally

- `npm run compile`<br>
to start the compiler in watch mode
- open this folder in vsCode and press `F5`
