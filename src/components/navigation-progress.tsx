"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"

// Configure NProgress
NProgress.configure({
  minimum: 0.15,
  easing: "ease",
  speed: 400,
  showSpinner: false,
})

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return
      const href = target.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("http") || target.target === "_blank") return
      if (href !== pathname) NProgress.start()
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [pathname])

  return null
}

export function NavigationProgress() {
  return (
    <>
      {/* NProgress CSS */}
      <style>{`
        #nprogress {
          pointer-events: none;
        }
        #nprogress .bar {
          background: hsl(var(--primary));
          position: fixed;
          z-index: 9999;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
        }
        #nprogress .peg {
          display: block;
          position: absolute;
          right: 0px;
          width: 100px;
          height: 100%;
          box-shadow: 0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary));
          opacity: 1;
          transform: rotate(3deg) translate(0px, -4px);
        }
      `}</style>
      <Suspense fallback={null}>
        <NavigationProgressInner />
      </Suspense>
    </>
  )
}
