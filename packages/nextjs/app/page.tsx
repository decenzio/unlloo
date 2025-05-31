"use client";

import type { NextPage } from "next";
import Body from "~~/components/custom/body";

const Home: NextPage = () => {
  return (
    <div className="w-full max-w-screen-2xl mx-auto px-2 sm:px-6 pt-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold">Unlloo protocol</h1>
        <p className="text-g mt-3 max-w-xl mx-auto">
          We&#39;re not just a DeFi reputation score. Here, you level up, get achivements and build an on-chain identity
          you&#39;ll actually be proud of.
        </p>
      </div>

      {/* Content */}
      <Body />
    </div>
  );
};

export default Home;
