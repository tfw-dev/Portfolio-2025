import InteractiveGlobs from "./rotating_globs"
import GlassLens from "./glasslens"
export default function Hero() {
    return (
        <div id="hero" className="h-dvh">
            <GlassLens size={320} />
            <h1 className="absolute top-30 left-1/2 -translate-x-1/2">Taylor Frank // Web Contractor</h1>
            <ul className="absolute top-1/2 left-[15dvw] -translate-y-1/2" >
            <li>In Web Since: 2019</li>
            <li>Location: Los Angeles, Seattle</li>
            <li>Focus: E-commerce & Shopify ecosystems</li>
            </ul>
            <ul className="absolute top-1/2 right-[15dvw] -translate-y-1/2" >
            <li>In Web Since: 2019</li>
            <li>Location: Los Angeles, Seattle</li>
            <li>Focus: E-commerce & Shopify ecosystems</li>
            </ul>
        </div>
    
    )
}
