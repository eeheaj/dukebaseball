import { useEffect, useState } from "react";

// Phones and tablets: a touch screen is the main pointer. Laptops with touch screens still count as desktop.
const QUERY = "(pointer: coarse)";

/** True on phones/tablets, where "add a photo" should open the camera directly. */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}
