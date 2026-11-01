"""Builds index.html (the file to host) from tt-planner.html (the source).

tt-planner.html is a page fragment: it has no doctype, charset or viewport tag.
index.html wraps it with those so it works as a normal website, including on phones.
Run:  python3 build.py
"""
import os
d = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(d, 'tt-planner.html'), encoding='utf-8').read()
i = s.index('</style>') + len('</style>')
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<style>:root{color-scheme:light}body{margin:0}[hidden]{display:none!important}</style>\n')
open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(
    head + s[:i] + '\n</head>\n<body>\n' + s[i:] + '\n</body>\n</html>\n')
print('Built index.html')
