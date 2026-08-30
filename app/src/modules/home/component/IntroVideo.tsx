import React from "react";

function IntroVideo() {
  return (
    <div className="w-full h-auto mt-6 md:mt-8 lg:mt-10  py-6 lg:py-12">
      <div className=" mx-auto relative">
        <div className="absolutea max-w-[90%]  overflow-hidden rounded-4xl mx-auto">
          <video width="100%" height="auto" muted autoPlay controls={false}>
            <source src="https://pub-db02f4666efb4ae9b337950ff0610772.r2.dev/Website%20demo%20-%20Rivi%20AI%20SDK%20-%20Different%20ways%20to%20integrate%20(2)%20(1).mp4" />
          </video>
        </div>
      </div>
    </div>
  );
}

export default IntroVideo;
