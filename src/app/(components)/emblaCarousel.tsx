import React, { useCallback } from "react";
import { EmblaOptionsType, EmblaCarouselType } from "embla-carousel";
import {
  DotButton,
  useDotButton,
} from "@/src/components/ui/EmblaCarouselDotButton";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { useRouter } from "next/navigation";

type PropType = {
  slides: number[];
  options?: EmblaOptionsType;
};

const EmblaCarousel: React.FC<PropType> = (props) => {
  const { slides, options } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel(options, [
    Autoplay({ playOnInit: true, delay: 4000, stopOnInteraction: false }),
  ]);
  const router = useRouter();

  const handleImageClick = useCallback(
    (index: number) => {
      router.push(`/`);
    },
    [router]
  );

  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  return (
    <section className="embla">
      <div className="embla__viewport rounded-2xl" ref={emblaRef}>
        <div className="embla__container">
          {slides.map((index) => (
            <div className="embla__slide" key={index}>
              <div className="embla__slide__number">
                <img
                  src="/no-image.svg"
                  alt="slider"
                  className="rounded-2xl"
                  onClick={() => handleImageClick(index)}
                  style={{ cursor: "pointer" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center embla__controls">
        <div className="embla__dots">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              onClick={() => onDotButtonClick(index)}
              className={"embla__dot".concat(
                index === selectedIndex ? " embla__dot--selected" : ""
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default EmblaCarousel;
