-- CreateIndex
CREATE INDEX "answers_isCorrect_idx" ON "answers"("isCorrect");

-- CreateIndex
CREATE INDEX "answers_gradedById_idx" ON "answers"("gradedById");

-- CreateIndex
CREATE INDEX "certificates_examId_idx" ON "certificates"("examId");

-- CreateIndex
CREATE INDEX "certificates_issuedAt_idx" ON "certificates"("issuedAt");

-- CreateIndex
CREATE INDEX "exams_title_idx" ON "exams"("title");

-- CreateIndex
CREATE INDEX "exams_tags_idx" ON "exams"("tags");

-- CreateIndex
CREATE INDEX "exams_publishedAt_idx" ON "exams"("publishedAt");

-- CreateIndex
CREATE INDEX "exams_expiresAt_idx" ON "exams"("expiresAt");

-- CreateIndex
CREATE INDEX "exams_createdAt_idx" ON "exams"("createdAt");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_createdAt_idx" ON "organizations"("createdAt");

-- CreateIndex
CREATE INDEX "question_banks_ownerId_idx" ON "question_banks"("ownerId");

-- CreateIndex
CREATE INDEX "question_banks_orgId_idx" ON "question_banks"("orgId");

-- CreateIndex
CREATE INDEX "question_banks_visibility_idx" ON "question_banks"("visibility");

-- CreateIndex
CREATE INDEX "question_banks_createdAt_idx" ON "question_banks"("createdAt");

-- CreateIndex
CREATE INDEX "questions_tags_idx" ON "questions"("tags");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "questions_createdAt_idx" ON "questions"("createdAt");

-- CreateIndex
CREATE INDEX "submissions_startedAt_idx" ON "submissions"("startedAt");

-- CreateIndex
CREATE INDEX "submissions_completedAt_idx" ON "submissions"("completedAt");

-- CreateIndex
CREATE INDEX "submissions_createdAt_idx" ON "submissions"("createdAt");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
