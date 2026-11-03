import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/context/socket-context";
import {
  addDiscussionAnswerService,
  addDiscussionQuestionService,
  fetchDiscussionsService,
} from "@/services";
import { MessageSquare, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Replaces a question in the list, or prepends it if it is new
function upsert(list, item) {
  const exists = list.some((q) => q._id === item._id);
  return exists ? list.map((q) => (q._id === item._id ? item : q)) : [item, ...list];
}

function CourseDiscussion({ courseId, lectureId }) {
  const socket = useSocket();
  const [questions, setQuestions] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});

  const loadPage = useCallback(
    async (cursor) => {
      setLoading(true);
      try {
        const response = await fetchDiscussionsService(courseId, cursor);
        if (response?.success) {
          setQuestions((prev) => (cursor ? [...prev, ...response.data] : response.data));
          setNextCursor(response.pagination.nextCursor);
        }
      } finally {
        setLoading(false);
      }
    },
    [courseId]
  );

  useEffect(() => {
    if (courseId) loadPage();
  }, [courseId, loadPage]);

  // Live updates from other learners; the socket already joined the course room
  useEffect(() => {
    if (!socket) return undefined;
    const onChange = (question) => {
      if (question.courseId === courseId) setQuestions((prev) => upsert(prev, question));
    };
    socket.on("discussion:new", onChange);
    socket.on("discussion:answer", onChange);
    return () => {
      socket.off("discussion:new", onChange);
      socket.off("discussion:answer", onChange);
    };
  }, [socket, courseId]);

  async function handleAsk(event) {
    event.preventDefault();
    if (!text.trim()) return;
    const response = await addDiscussionQuestionService(courseId, text.trim(), lectureId);
    if (response?.success) {
      setQuestions((prev) => upsert(prev, response.data));
      setText("");
    }
  }

  async function handleAnswer(questionId) {
    const draft = replyDrafts[questionId]?.trim();
    if (!draft) return;
    const response = await addDiscussionAnswerService(courseId, questionId, draft);
    if (response?.success) {
      setQuestions((prev) => upsert(prev, response.data));
      setReplyDrafts((prev) => ({ ...prev, [questionId]: "" }));
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <form onSubmit={handleAsk} className="space-y-2">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ask the instructor or other learners a question..."
          className="h-20 resize-none border-white/10 bg-black/30 text-white"
          aria-label="Ask a question"
        />
        <Button type="submit" size="sm" className="gap-2" disabled={!text.trim()}>
          <Send className="h-4 w-4" /> Post question
        </Button>
      </form>

      <div className="space-y-3">
        {questions.length === 0 && !loading && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <MessageSquare className="h-4 w-4" /> No questions yet. Be the first to ask.
          </p>
        )}
        {questions.map((question) => (
          <div key={question._id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <p className="font-semibold">{question.userName}</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-200">{question.text}</p>
            {question.answers?.map((answer) => (
              <div key={answer._id} className="mt-2 border-l-2 border-indigo-400/50 pl-3">
                <p className="text-xs font-semibold text-indigo-300">
                  {answer.userName}
                  {answer.role === "instructor" && " · Instructor"}
                </p>
                <p className="whitespace-pre-wrap text-slate-300">{answer.text}</p>
              </div>
            ))}
            <div className="mt-2 flex gap-2">
              <input
                value={replyDrafts[question._id] || ""}
                onChange={(event) =>
                  setReplyDrafts((prev) => ({ ...prev, [question._id]: event.target.value }))
                }
                placeholder="Reply..."
                aria-label={`Reply to ${question.userName}`}
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-white"
              />
              <Button size="sm" variant="secondary" onClick={() => handleAnswer(question._id)}>
                Reply
              </Button>
            </div>
          </div>
        ))}
        {nextCursor && (
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => loadPage(nextCursor)}>
            {loading ? "Loading..." : "Load older questions"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default CourseDiscussion;
