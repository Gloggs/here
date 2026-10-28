"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, qs } from "@/lib/client";
import { Loading } from "../ui";

// Old address. Sends people to the class page that now holds the register.
function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    api.get("/api/classes").then((list) => {
      const wanted = params.get("class");
      const cls = list.find((c) => c.name === wanted) || list.find((c) => c.students > 0) || list[0];
      router.replace(cls ? `/dashboard/classes/${cls.id}?${qs({ date: params.get("date") })}` : "/dashboard");
    }).catch(() => router.replace("/dashboard"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Loading />;
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Redirect /></Suspense>;
}
