"use client";
import { useEffect } from "react";
import { clearDevice } from "@/lib/outbox";

/** Runs after signing out or ending the demo: deletes the register copies and waiting marks kept on this device. */
export default function ClearDevice() {
  useEffect(() => { clearDevice(); }, []);
  return null;
}
