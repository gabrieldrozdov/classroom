import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--no-sandbox"])
        pg=await b.new_page(viewport={"width":1200,"height":760})
        errs=[]
        pg.on("pageerror", lambda e: errs.append("PAGEERR:"+str(e)))
        pg.on("console", lambda m: errs.append("CE:"+m.text) if m.type=="error" and "ERR_EMPTY_RESPONSE" not in m.text else None)
        await pg.goto("http://localhost:8099/type-and-code-v3/syllabus/", wait_until="networkidle")
        await pg.evaluate("() => localStorage.removeItem('classroom-whiteboard')")
        await pg.evaluate("() => window.openPresentation()"); await pg.wait_for_timeout(300)
        await pg.evaluate("""() => [...document.querySelectorAll('.presentation button')].find(x=>x.dataset.draw=='whiteboard').click()"""); await pg.wait_for_timeout(400)
        print("cursor:", await pg.evaluate("()=>document.querySelector('.presentation-draw-canvas').style.cursor"))
        # THROTTLE test: do one slow drag with many small moves, count renderView calls
        await pg.evaluate("()=>{window.__RC=0;}")
        await pg.mouse.move(300,400); await pg.mouse.down()
        for i in range(60):
            await pg.mouse.move(300+i*8, 400+ (i%2)*3)
        await pg.mouse.up()
        await pg.wait_for_timeout(100)
        rc = await pg.evaluate("()=>window.__RC")
        print(f"THROTTLE: 60 pointermoves in one stroke -> {rc} renderView calls (should be << 60)")
        # brush sizes present?
        sizes = await pg.evaluate("""()=>[...document.querySelectorAll('.presentation-draw-size')].map(b=>b.dataset.size)""")
        print("brush sizes:", sizes, "(expect 4,12,24)")
        # PAN LIMIT: pan a huge amount, camera should clamp
        await pg.mouse.move(600,380)
        for _ in range(80): await pg.mouse.wheel(600,600)
        await pg.wait_for_timeout(150)
        # infer panX via a drawn marker? Instead check that further panning doesn't move content
        # draw a dot, note screen pos, pan more, it should not move (clamped)
        await pg.mouse.move(500,300); await pg.mouse.down(); await pg.mouse.move(520,300,steps=3); await pg.mouse.up(); await pg.wait_for_timeout(80)
        def darkbb():
            return """() => { let cv=document.querySelector('.presentation-draw-canvas'); let ctx=cv.getContext('2d'); let W=cv.width,H=cv.height,dpr=window.devicePixelRatio;
              let d=ctx.getImageData(0,0,W,H).data; let minX=W,maxX=-1; for(let i=0;i<d.length;i+=4){if(d[i]<90&&d[i+1]<90&&d[i+2]<90){let px=i/4,x=px%W;if(x<minX)minX=x;if(x>maxX)maxX=x;}} return maxX<0?null:{sxMin:Math.round(minX/dpr),sxMax:Math.round(maxX/dpr)}; }"""
        bb_a = await pg.evaluate(darkbb())
        for _ in range(40): await pg.mouse.wheel(600,0)  # try to pan further right (should be clamped)
        await pg.wait_for_timeout(120)
        bb_b = await pg.evaluate(darkbb())
        print(f"PAN LIMIT: marker bbox before extra pan {bb_a}, after {bb_b} (unchanged = clamped)")
        print("ERRORS:", errs[-8:] if errs else "none")
        await b.close()
asyncio.run(main())
