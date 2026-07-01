"use client";

import dynamic from "next/dynamic";

const StructureForm = dynamic(() => import("@/components/chem/StructureForm"), {
  ssr: false,
});

export default function StructureFormLoader() {
  return <StructureForm />;
}
