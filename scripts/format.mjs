import ts from 'typescript';import fs from 'node:fs';
for(const file of fs.readdirSync('src').filter(f=>f.endsWith('.ts'))){const source=ts.createSourceFile(file,fs.readFileSync('src/'+file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);fs.writeFileSync('src/'+file,ts.createPrinter({newLine:ts.NewLineKind.LineFeed}).printFile(source));}
console.log('TypeScript source formatted without new dependencies.');
