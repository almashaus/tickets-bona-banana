"use client";

import { FileCheck, Target, ThumbsUp, Zap, Diamond } from "lucide-react";

export function Collaboration() {
  return (
    <div className=" bg-greenColor text-white">
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Section */}
          <div className="space-y-8">
            <h1 className="text-4xl lg:text-5xl text-center lg:text-start font-bold leading-tight">
              Interested In Collaboration With
              <span className="text-yellowColor inline-block mx-2">
                Bona Banana
              </span>
              ?
            </h1>

            <div className="bg-white rounded-2xl p-2 flex items-center gap-3 max-w-xl shadow-xl">
              <input
                type="text"
                placeholder="Enter your email"
                className="flex-1 px-6 py-3 text-gray-700 text-lg outline-none rounded-xl"
              />
              <a
                href={`mailto:info@bona-banana.com?subject=${encodeURIComponent(
                  "Collaboration with Bona Banana"
                )}`}
                className="p-4 rounded-lg bg-orangeColor text-white font-medium"
              >
                Send Email
              </a>
            </div>
          </div>

          {/* Right Section - Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2 lg:p-3 bg-stone-500 rounded-lg flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <p className="text-lg pt-2">
                Thousands of successfully completed project
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 lg:p-3 bg-stone-500 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <p className="text-lg pt-2">
                Data-driven & well thought-proven strategies
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 lg:p-3 bg-stone-500 rounded-lg flex items-center justify-center">
                <ThumbsUp className="w-6 h-6" />
              </div>
              <p className="text-lg pt-2">
                98% Five star reviews from the client
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 lg:p-3 bg-stone-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <p className="text-lg pt-2">
                Helped businesses in a variety of industries to reach their
                target audiences
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 lg:p-3 bg-stone-500 rounded-lg flex items-center justify-center">
                <Diamond className="w-6 h-6" />
              </div>
              <p className="text-lg pt-2">
                Dedicated to providing quality service and customer
                satisfaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
