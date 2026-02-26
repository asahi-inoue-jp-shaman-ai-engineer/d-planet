import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Subscription() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const search = window.location.search || "";
    setLocation(`/charge${search}`);
  }, [setLocation]);

  return null;
}
