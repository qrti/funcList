'use strict';

import * as vscode from 'vscode';
import { workspace, window } from 'vscode';
import { decodeFsPath } from './provider';

export default class FunctionsDocument
{
    readonly NUM_SORTS = 2;
    
    // private _emitter: vscode.EventEmitter<vscode.Uri>;    
	private _targetEditor: vscode.TextEditor;
	private _sourceEditor: vscode.TextEditor;
	private _functionList: Map<string, {native: string, num: number, index: number}>;
    private _sort: number = 0;
    private _doubleSpacing: boolean;

	private _lines: string[];

    // constructor(target_uri: vscode.Uri, emitter: vscode.EventEmitter<vscode.Uri>)
    constructor(sourceEditor: vscode.TextEditor, targetEditor: vscode.TextEditor)
    {
        this._sourceEditor = sourceEditor;                                                    
        this._targetEditor = targetEditor;                                                    
		// this._emitter = emitter;                                        
        
        let config = workspace.getConfiguration('funcList');                        // get config
        let sort = +config.get("sortList");                                         // default sort for new FuncDoc
        this._doubleSpacing = config.get("doubleSpacing");                          // double spacing

        this._functionList = this.getFunctionList();                                // get function list     
        this.sortFunctionList(sort);                                                // sort it if necessary

        this.populate();                                                            // populate target
	}
    
    public getNative(index)                                                         // return stored native match
    {
        return Array.from(this._functionList.values())[index].native;               
    }

    public getDoubleSpacing()                                                       // return double spacing
    {
        return this._doubleSpacing;
    }

    public update(sortSwitch)
    {
        if(sortSwitch){  
            let sort = this._sort;                                                  // switchSort
            sort = ++sort>=this.NUM_SORTS ? 0 : sort;                               // switch sort            
            this.sortFunctionList(sort);                                            // sort 
        }
        else{                                                                       // refresh
            this._functionList = this.getFunctionList();                            //         funcList
            let sort = this._sort;                                                  // save current sort
            this._sort = 0;                                                         // reset sort 
            this.sortFunctionList(sort);                                            // sort
        }

        this.populate();                                                            // populate target            
    }

    private populate() 
    {
        this._lines = [`(${this._functionList.size} matches, ${this._sort ? 'sorted' : 'unsorted'})\n`];

        this._functionList.forEach((value, display) => {
            this._lines.push(display + (value.num==1 ? "" : ` (${value.num})`));
        });

        let targetDoc = this._targetEditor.document;
        applyEdit(targetDoc, {start: {line: 0, char: 0}, end: {line: Number.MAX_SAFE_INTEGER, char: 0}}, this._lines.join(this._doubleSpacing ? '\n\n' : '\n'));           
        
        let posSel = new vscode.Position(0, 0);                                     // jump to first line        
        let selection = new vscode.Selection(posSel, posSel);                       // no selection 
        let range = new vscode.Range(posSel, posSel);                               // to prevent source positioning
        this._targetEditor.revealRange(range);          
        this._targetEditor.selection = selection;                        

        // this._emitter.fire(this._target_uri);        
    }

    private getFunctionList()
    {
        let sourceDoc = this._sourceEditor.document;                                // get source document

        let config = workspace.getConfiguration('funcList');                        // get config
        let nativeFilter = stringRegExp(config.get("nativeFilter"));                // native  filter

        let grin = { value: 0 };                                                    // group index
        let displayFilter = stringRegExp(config.get("displayFilter"), grin);        // display 

        let docContent = sourceDoc.getText();                                       // get doc text
        let native = docContent.match(nativeFilter);                                // nativeFind array    
        
        let map = new Map<string, { native: string, num: number, index: number }>();    // displayFind, { nativeFind, numFind, findIndex }

        if(native){
            let i = 0;                                                              // findIndex
            let chars = { '\n':'', '\r':'' };                                       // replacement pairs, name:value

            native.forEach(native => {
                let nativec = native.replace(/[\n\r]/g, m => chars[m]);             // native cleaned stripped CR and LF
                let display = nativec.match(displayFilter)[grin.value];             // display filter
                let value = map.get(display);                                       // get { nativeFind, numFind }
                
                if(value)                                                           // existing { nativeFind, numFind }
                    value.num++;
                else                                                                // initial
                    map.set(display, { native: nativec, num: 1, index: i++ });
            });
        }

        return map;
    }

    private sortFunctionList(sort: number)
    {
        if(sort == this._sort)                                                      // no sort necessary
            return;
        else if(sort == 0)                                                          // sort value, index
            this._functionList = new Map(Array.from(this._functionList).sort((a, b) => a[1].index - b[1].index)); 
        else if(sort == 1)                                                          // sort key, display
            this._functionList = new Map(Array.from(this._functionList).sort());    
        
        this._sort = sort;                                                          // update
    }
}

function stringRegExp(s: string, grin?: { value: number } ): RegExp
{
    let flags: string = s.replace(/.*\/([gimy0-9]*)$/, '$1');
    let pattern: string = s.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');

    if(grin){
        let p = flags.search(/\d/);

        if(p != undefined){
            grin.value = +flags.substr(p, 1);
            flags = flags.replace(/[0-9]/, '');
        }
    }

    return new RegExp(pattern, flags);    
}

function applyEdit(doc, coords, content)
{    
    let start = new vscode.Position(coords.start.line, coords.start.char);
    let end = new vscode.Position(coords.end.line, coords.end.char);
    let range = new vscode.Range(start, end);   
    
    let wedit = new vscode.TextEdit(range, content);                    
    let workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(doc.uri, [wedit]);
    workspace.applyEdit(workspaceEdit);    
}
