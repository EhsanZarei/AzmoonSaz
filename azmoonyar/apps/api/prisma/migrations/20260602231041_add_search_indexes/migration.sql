-- CreateIndex
CREATE INDEX "answers_submissionId_questionId_idx" ON "answers"("submissionId", "questionId");

-- CreateIndex
CREATE INDEX "answers_questionId_isCorrect_idx" ON "answers"("questionId", "isCorrect");

-- CreateIndex
CREATE INDEX "certificates_expiresAt_idx" ON "certificates"("expiresAt");

-- CreateIndex
CREATE INDEX "certificates_revokedAt_idx" ON "certificates"("revokedAt");

-- CreateIndex
CREATE INDEX "certificates_userId_issuedAt_idx" ON "certificates"("userId", "issuedAt");

-- CreateIndex
CREATE INDEX "exams_category_idx" ON "exams"("category");

-- CreateIndex
CREATE INDEX "exams_status_publishedAt_idx" ON "exams"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "exams_orgId_status_idx" ON "exams"("orgId", "status");

-- CreateIndex
CREATE INDEX "exams_ownerId_status_idx" ON "exams"("ownerId", "status");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "question_banks_name_idx" ON "question_banks"("name");

-- CreateIndex
CREATE INDEX "question_banks_ownerId_visibility_idx" ON "question_banks"("ownerId", "visibility");

-- CreateIndex
CREATE INDEX "question_banks_orgId_visibility_idx" ON "question_banks"("orgId", "visibility");

-- CreateIndex
CREATE INDEX "questions_examId_orderIndex_idx" ON "questions"("examId", "orderIndex");

-- CreateIndex
CREATE INDEX "questions_bankId_type_idx" ON "questions"("bankId", "type");

-- CreateIndex
CREATE INDEX "questions_type_difficulty_idx" ON "questions"("type", "difficulty");

-- CreateIndex
CREATE INDEX "submissions_examId_status_idx" ON "submissions"("examId", "status");

-- CreateIndex
CREATE INDEX "submissions_userId_status_idx" ON "submissions"("userId", "status");

-- CreateIndex
CREATE INDEX "submissions_examId_completedAt_idx" ON "submissions"("examId", "completedAt");

-- CreateIndex
CREATE INDEX "submissions_passed_idx" ON "submissions"("passed");
