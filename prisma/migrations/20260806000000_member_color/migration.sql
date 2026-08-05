-- CreateTable
CREATE TABLE "MemberColor" (
    "memberId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberColor_pkey" PRIMARY KEY ("memberId")
);
