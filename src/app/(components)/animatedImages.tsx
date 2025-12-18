import {
  BentoCell,
  BentoGrid,
  ContainerScroll,
  ContainerScale,
} from "@/src/components/blocks/gridScrollAnimation";
import { useLanguage } from "@/src/components/i18n/language-provider";

const IMAGES = [
  "/images/20.jpeg",
  "/images/10.jpeg",
  "/images/60.jpeg",
  "/images/40.jpeg",
  "/images/50.jpeg",
];
const AnimatedImages = () => {
  const { t, language } = useLanguage();
  return (
    <ContainerScroll className="md:container h-[250vh] px-6 lg:px-24 xl:px-48">
      <BentoGrid className="sticky left-0 top-0 z-0 h-screen w-full p-1 pt-16">
        {IMAGES.map((imageUrl, index) => (
          <BentoCell
            key={index}
            className="overflow-hidden rounded-xl shadow-xl"
          >
            <img
              className="size-full object-cover object-center"
              src={imageUrl}
              alt=""
            />
          </BentoCell>
        ))}
        <ContainerScale className="absolute top-1/4 md:top-1/2 left-1/2 z-0 text-center mt-12 md:mt-4 w-full md:w-fit">
          <h1 className="w-full text-5xl font-bold tracking-tighter">
            {language === "ar" && t("home.gallary")}
            <span className="text-yellowColor mx-3">Bona Banana</span>
            {language === "en" && t("home.gallary")}
          </h1>
          <p className="my-6 text-lg md:text-xl text-stone-500">
            {t("home.gallarySubtitle")}
          </p>
        </ContainerScale>
      </BentoGrid>
    </ContainerScroll>
  );
};

export { AnimatedImages };
