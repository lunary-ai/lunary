import { useEffect } from "react";
import { useRouter } from "next/router";

const NewAlertPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace("/alerts?modal=create", undefined, { shallow: true });
  }, [router]);
  return null;
};

export default NewAlertPage;
