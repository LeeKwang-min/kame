import { Button } from "@/components/ui/button";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface IProps {
  title?: string;
  className?: string;
}

function KameHeader({ title, className }: IProps) {
  return (
    <header
      className={cn(
        "w-full flex items-center justify-between",
        className
      )}
    >
      <Link href="/">
        <div className="relative w-[80px] h-[36px] group flex items-center justify-center">
          <h2 className="text-2xl font-bold group-hover:opacity-0 transition-opacity duration-300">
            KAME
          </h2>
          <Image
            src="/image/logo.gif"
            alt="Kame animated"
            fill
            className="object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        </div>
      </Link>
      {title && (
        <div className="flex flex-col items-end">
          <h2 className="text-xl font-bold text-center">{title}</h2>
          {/* <span className="text-sm text-gray-500">어쩌고 저쩌고</span> */}
        </div>
      )}
      {/* <Button
        variant="ghost"
        className="cursor-pointer hover:scale-140 transition-all duration-300"
      >
        <MenuIcon className="w-4 h-4" />
      </Button> */}
    </header>
  );
}

export default KameHeader;
