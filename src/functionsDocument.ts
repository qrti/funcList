'use strict';

import * as vscode from 'vscode';
import { stringRegExp } from './provider';

export default class FunctionsDocument
{
	private _target_uri: vscode.Uri;
	private _functionList: Map<string, {native: string, num: number}>;
	private _emitter: vscode.EventEmitter<vscode.Uri>;
    private _sort: number;

	private _lines: string[];

    constructor(target_uri: vscode.Uri, functionList: Map<string, {native: string, num: number}>, sort: number, emitter: vscode.EventEmitter<vscode.Uri>)
    {
		this._target_uri = target_uri;
        this._functionList = functionList;		
        this._sort = sort;
		this._emitter = emitter;                                        

        this._populate();
	}

    get value(){
        return this._lines.join('\n');
	}

    private _populate() 
    {
        this._lines = [`(${this._functionList.size} matches, ${this._sort ? 'sorted' : 'unsorted'})\n`];

        this._functionList.forEach((value, display) => {
            this._lines.push(display + (value.num==1 ? "" : ` (${value.num})`));
        });

        this._emitter.fire(this._target_uri);
    }
}
