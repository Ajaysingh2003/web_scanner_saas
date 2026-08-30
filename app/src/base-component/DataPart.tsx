import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

function DataPart() {
  let data = [
    {
      id: 1,
      title: "2. Craft the perfect customer-facing AI",
      icon: <Star className="size-5" />,
      description:
        "Build your agent in minutes without code using flagship AI models, custom prompts, rules and design. Then easily embed on your website, app, docs or slack.",
    },
    {
      id: 2,
      title: "3. Craft the perfect customer-facing AI",
      icon: <Star className="size-5" />,
      description:
        "Build your agent in minutes without code using flagship AI models, custom prompts, rules and design. Then easily embed on your website, app, docs or slack.",
    },
    {
      id: 3,
      title: "4. Craft the perfect customer-facing AI",
      icon: <Star className="size-5" />,
      description:
        "Build your agent in minutes without code using flagship AI models, custom prompts, rules and design. Then easily embed on your website, app, docs or slack.",
    },
    {
      id: 4,
      title: "5. Craft the perfect customer-facing AI",
      icon: <Star className="size-5" />,
      description:
        "Build your agent in minutes without code using flagship AI models, custom prompts, rules and design. Then easily embed on your website, app, docs or slack.",
    },
  ];

  const [active, setActive] = useState<number>(1);
  const descRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timeFunc = setInterval(() => {
      setActive((currentId) => {
        const lastId = data[data.length - 1].id;

        return currentId == lastId
          ? data[0].id
          : data[data.findIndex((d) => d.id === currentId) + 1].id;
      });
    }, 10000);
    descRefs.current.forEach((el, index) => {
      if (!el) return;

      if (data[index].id === active) {
        gsap.fromTo(
          el,
          {
            // clipPath: "inset(0 0 100% 0)",
            opacity: 0,
            height: "0",
          },
          {
            // clipPath: "inset(0 0 0% 0)",
            // transformOrigin: "top",
            height: "auto",
            opacity: 1,
            duration: 0.85,
            // ease: "power3.out",
            ease: "power3.out",
          }
        );
      } else {
        gsap.to(el, {
          height: 0,
          opacity: 0,
          duration: 0.35,
          ease: "power2.inOut",
        });
      }
    });

    return () => clearInterval(timeFunc);
  }, [active]);
  return (
    <div className="w-full h-full border-t border-b  border-white/20">
      <div className="grid grid-cols-1 h-auto   md:h-131  lg:grid-cols-12 mts-8">
        <div className=" col-span-6">
          <div className="item flex flex-col">
            {data.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setActive(e.id)}
                className={`relative w-full  cursor-pointer bg-white/5 px-6 py-8 lg:px-12 lg:py-10 
                flex items-start gap-5 border-b border-black/20 last:border-b-0 border-collapse overflow-hidden
                ${active === e.id ? "is-active" : ""}`}
              >
                <div className="flexs items-start h-fit   inline-block p-1">
                  {e.icon}
                </div>

                <div className="flex flex-col gap-2 text-left">
                  <h3 className=" text-secondary-header font-medium text-[17px] mb">
                    {e.title}
                  </h3>

                  {e.id == active && (
                    <div
                      ref={(el) => {
                        descRefs.current[i] = el;
                      }}
                    >
                      <p className={`opacity-60 max-w-130 pt-1  pb-2`}>
                        {e.description}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>




        <div className=" col-span-6 relative overflow-hidden ">
          {/* <div className=" bg-red-100s w-full absolute h-full  ">
            {Array.from({ length: 18 }, (_, i) => (
              <div className=" px-2 py-4  border-t first:border-t-0 border-white/20 border-collapse " />
            ))}
          </div> */}
          <div className="w-full absolute h-full">
            {Array.from({ length: 18 }, (_, i) => (
              <div
                key={i}
                className="relative px-2 py-4 border-t first:border-t-0 border-white/20 overflow-hidden"
              >
                {i % 1 === 0 && <span className="data-border-runner" />}
                {i % 1 === 0 && <span className="data-border-runner-back" />}
              </div>
            ))}
          </div>

          <div className=" flex h-full absolute ">
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className="w-12   overflow-hidden  border-r border-white/20 h-full relative" />
            ))}
          </div>
          <div className="bg-black/20 backdrop-blur-3xl rounded-4xl overflow-hidden max-w-84 z-50 absolute w-full top-1/2 left-1/2 -translate-1/2 h-full max-h-92 my-auto  ">
            <video
              autoPlay
              loop
              muted
              className="w-full h-full aspect-square object-cover"
            >
              <source src={"/video/feature.mp4"} type="video/mp4" />
            </video>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataPart;

