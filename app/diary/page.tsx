"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import DiarySelectPage from "./DiarySelectPage";
import DiaryPage from "./DiaryPage";

const DiaryRouterInner = () => {
  const searchParam = useSearchParams();
  const id = searchParam.get("id");

  if (id) {
    return <DiaryPage id={id} />;
  } else {
    return <DiarySelectPage />;
  }
};

const DiaryRoutePage = () => {
  return (
    <Suspense fallback={<div className="p-4">Đang tải...</div>}>
      <div className="pb-24">
        <DiaryRouterInner />
      </div>
    </Suspense>
  );
};

export default DiaryRoutePage;
