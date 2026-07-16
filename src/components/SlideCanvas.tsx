import { Check, Quote } from 'lucide-react'
import { classes } from '../lib/format'
import type { PresentationSlide } from '../types'

export function SlideCanvas({ slide, className, labelled = true }: { slide: PresentationSlide; className?: string; labelled?: boolean }) {
  const image = slide.videoUrl ? (
    <figure className="slide-image-wrap slide-video-wrap">
      <video src={slide.videoUrl} controls playsInline preload="metadata" aria-label={slide.imageAlt || 'Slide video'} />
      {slide.caption && <figcaption>{slide.caption}</figcaption>}
    </figure>
  ) : slide.imageUrl ? (
    <figure className="slide-image-wrap">
      <img src={slide.imageUrl} alt={slide.imageAlt || ''} />
      {slide.caption && <figcaption>{slide.caption}</figcaption>}
    </figure>
  ) : null

  const copy = (
    <div className="slide-copy">
      {slide.eyebrow && <p className="slide-eyebrow">{slide.eyebrow}</p>}
      {slide.layout === 'quote' && <Quote className="quote-mark" size={36} strokeWidth={1.4} aria-hidden="true" />}
      <h2>{slide.title || 'Untitled slide'}</h2>
      {slide.body && <p className="slide-body">{slide.body}</p>}
      {slide.points && slide.points.length > 0 && (
        <ul className="slide-points">
          {slide.points.map((point, index) => (
            <li key={`${point}-${index}`}><span><Check size={18} /></span>{point}</li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <section
      className={classes('slide-canvas', `slide-${slide.layout}`, `tone-${slide.tone}`, className)}
      aria-label={labelled ? `Slide: ${slide.title}` : undefined}
    >
      <span className="slide-shape shape-one" aria-hidden="true" />
      <span className="slide-shape shape-two" aria-hidden="true" />
      {slide.layout === 'image' ? <>{image}{copy}</> : slide.layout === 'split' ? <>{copy}{image}</> : copy}
    </section>
  )
}
