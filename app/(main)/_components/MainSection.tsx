"use client";
import { useState } from "react";
import MainMenuList from "./MainMenuList";
import MainSearchBar from "./MainSearchBar";
import MainCategorySelect from "./MainCategorySelect";
import MainRotatingText from "./MainRotatingText";

function MainSection() {
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("ALL");

  return (
    <div className="flex flex-col gap-10 grow items-center">
      <MainRotatingText />
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-1 max-[698px]:gap-2 max-[698px]:items-start max-[698px]:flex-col-reverse">
          <MainSearchBar search={search} setSearch={setSearch} />
          <MainCategorySelect category={category} setCategory={setCategory} />
        </div>
        <MainMenuList keyword={search} category={category} />
      </div>
    </div>
  );
}

export default MainSection;
