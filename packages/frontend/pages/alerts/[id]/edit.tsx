import { useEffect } from "react";
import { useRouter } from "next/router";

const EditAlertPage = () => {
  const router = useRouter();
  const { id } = router.query;
  useEffect(() => {
    if (typeof id === "string") {
      router.replace(`/alerts?modal=edit&id=${id}`, undefined, {
        shallow: true,
      });
    }
  }, [id, router]);
  return null;
};

export default EditAlertPage;
