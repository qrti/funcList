'use strict';

import * as vscode from 'vscode';
import { workspace, window } from 'vscode';
import { decodeFsPath } from './provider';

export default class FunctionsDocument {
    readonly NUM_SORTS = 3;

    // private _emitter: vscode.EventEmitter<vscode.Uri>;    
    private _sourceEditor: vscode.TextEditor;
    private _functionList: Map<string, { native: string, num: number, index: number }>;
    private _sort: number = 0;
    private _doubleSpacing: boolean;
    private _filter;        // : {extensions: string[], native: string, display: string, sort: number};
    private _lines: string[];
    private _content: string;
    private _uri: vscode.Uri;                                                       // unused

    // constructor(target_uri: vscode.Uri, emitter: vscode.EventEmitter<vscode.Uri>)
    constructor(sourceEditor: vscode.TextEditor, filter, uri: vscode.Uri) {
        this._sourceEditor = sourceEditor;
        this._filter = filter;
        this._uri = uri;
        // this._emitter = emitter;                                        

        let config = workspace.getConfiguration('funcList');                        // get config
        this._doubleSpacing = config.get("doubleSpacing");                          // double spacing
        let sort:number = config.get('sort');                                           // default sort for new FuncDoc
        console.log(sort);
        this._functionList = this.getFunctionList();                                // get function list     
        this.sortFunctionList(sort);                                                // sort it if necessary

        this.prepContent();                                                         // prepare content 
    }

    public getNative(index)                                                         // return stored native match
    {
        return Array.from(this._functionList.values())[index].native;
    }

    public getDoubleSpacing()                                                       // return double spacing
    {
        return this._doubleSpacing;
    }

    public getContent()                                                             // return content
    {
        return this._content;
    }

    public getUri() {
        return this._uri;
    }

    public update(sortSwitch) {
        if (sortSwitch) {
            let sort = this._sort;                                                  // switchSort
            sort = ++sort >= this.NUM_SORTS ? 0 : sort;                               // switch sort            
            this.sortFunctionList(sort);                                            // sort 
        }
        else {                                                                       // refresh
            this._functionList = this.getFunctionList();                            //         funcList
            let sort = this._sort;                                                  // save current sort
            this._sort = 0;                                                         // reset sort 
            this.sortFunctionList(sort);                                            // sort
        }

        this.prepContent();                                                         // prepare content            
    }

    public getNativeFilter() {
        return stringRegExp(this._filter.native);
    }

    public getNativeFilters() {
        let filters = [];
        Object.keys(this._filter).forEach(i => {
            filters.push(stringRegExp(this._filter[i].native));
        });

        return filters;
    }

    private prepContent() {
        this._lines = [`(${this._functionList.size} matches, ${this._sort ? this._sort == 1 ? 'nocase' : 'case' : 'appear'})\n`];

        this._functionList.forEach((value, display) => {
            //console.log(value);
            //console.log(display);
            this._lines.push(display + (value.num == 1 ? "" : ` (${value.num})`));
        });

        this._content = this._lines.join(this._doubleSpacing ? '\n\n' : '\n');

        // this._emitter.fire(this._target_uri);        
    }

    private getFunctionList() {
        let sourceDoc = this._sourceEditor.document;                                // get source document

        let map = new Map<string, { native: string, num: number, index: number }>();    // displayFind, { nativeFind, numFind, findIndex }
        let value;
        let idx = 0;     // findIndex

        //console.log(this._filter);

        Object.keys(this._filter).forEach(i => {
            let nativeFilter = stringRegExp(this._filter[i].native);                       // native filter
            //console.log(nativeFilter);
            let grin = { value: 0 };                                                    // group index
            let displayFilter = stringRegExp(this._filter[i].display, grin);               // display 

            let docContent = sourceDoc.getText();                                       // get doc text
            let native = docContent.match(nativeFilter);                                // nativeFind array    

            if (native) {
                let chars = { '\n': '', '\r': '' };                                       // replacement pairs, name:value

                native.forEach(native => {
                    let nativec = native.replace(/[\n\r]/g, m => chars[m]);             // native cleaned stripped CR and LF
                    let display = nativec.match(displayFilter)[grin.value];             // display filter
                    value = map.get(display);   
                    
                    if (value) {                                                       // existing { nativeFind, numFind }
                        value.num++;
                    }
                    else                                                                // initial
                        map.set(display, { native: nativec, num: 1, index: idx++ });
                });
            }
        });

        return map;
    }

    private sortFunctionList(sort: number) {
        if (sort == this._sort) {                                                     // no sort necessary
            return;
        }
        else if (sort == 0) {                                                         // appear, sort value, index
            this._functionList = new Map(Array.from(this._functionList).sort((a, b) => a[1].index - b[1].index));
        }
        else if (sort == 1) {                                                         // nocase
            this._functionList = new Map(Array.from(this._functionList).sort((a, b) => {
                var x = a[1].native.toLowerCase();
                var y = b[1].native.toLowerCase();
                return x === y ? 0 : x > y ? 1 : -1;
            }));
        }
        else if (sort == 2) {                                                         // case
            this._functionList = new Map(Array.from(this._functionList).sort());
        }

        this._sort = sort;                                                          // update
    }
}

function stringRegExp(s: string, grin?: { value: number }): RegExp {
    let flags: string = s.replace(/.*\/([gimy0-9]*)$/, '$1');
    let pattern: string = s.replace(new RegExp('^/(.*?)/' + flags + '$'), '$1');

    if (grin) {
        let p = flags.search(/\d/);

        if (p != undefined) {
            grin.value = +flags.substr(p, 1);
            flags = flags.replace(/[0-9]/, '');
        }
    }

    return new RegExp(pattern, flags);
}
