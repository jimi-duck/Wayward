import os, re
import fragments as F
import previews as P

css = open('bundle-base.css').read() + F.WM_CSS + '\n/* icon masks (generated) */\n' + F.icon_css() + '\n'
os.makedirs('project/components', exist_ok=True)
open('project/components/bundle.css', 'w').write(css)
names = P.write()

# local harness: the page's frame preloads tokens.css + bundle.css and sets data-theme; emulate that
os.makedirs('local', exist_ok=True)
inject = ('<link rel="stylesheet" href="../local-tokens.css"><link rel="stylesheet" href="../project/components/bundle.css">'
          '<script>(function(){var q=new URLSearchParams(location.search);document.documentElement.dataset.theme=q.get("t")||"bridge";'
          'var z=q.get("z"),x=q.get("x");if(z||x)addEventListener("DOMContentLoaded",function(){var b=document.body;'
          'if(z)b.style.zoom=z==="fit"?(innerWidth/(+q.get("w")||960)):z;if(x)b.style.transform="translate(-"+x+"px,-"+(q.get("y")||0)+"px)";});})()</script>')
for n in names + (['Cover'] if os.path.exists('project/components/Cover/preview.html') else []):
    html = open(f'project/components/{n}/preview.html').read()
    html = html.replace('</title>', '</title>' + inject, 1)
    open(f'local/{n}.html', 'w').write(html)
print('bundle.css', len(css), 'bytes;', len(names), 'previews')
