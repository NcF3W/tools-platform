"use client";

import dynamic from "next/dynamic";

const EditTextForm = dynamic(() => import("@/components/pdf/EditTextForm"), {
  ssr: false,
});

export default function EditTextFormLoader() {
  return <EditTextForm />;
}