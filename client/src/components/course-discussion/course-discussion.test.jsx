import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CourseDiscussion from ".";
import {
  addDiscussionQuestionService,
  fetchDiscussionsService,
} from "@/services";

vi.mock("@/services", () => ({
  fetchDiscussionsService: vi.fn(),
  addDiscussionQuestionService: vi.fn(),
  addDiscussionAnswerService: vi.fn(),
}));

// A minimal fake socket that lets the test push server events
const listeners = {};
const fakeSocket = {
  on: (event, fn) => (listeners[event] = fn),
  off: (event) => delete listeners[event],
};
vi.mock("@/context/socket-context", () => ({ useSocket: () => fakeSocket }));

const question = (id, text) => ({ _id: id, courseId: "c1", userName: "Sam", text, answers: [] });

describe("CourseDiscussion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads more questions with the cursor from the previous page", async () => {
    fetchDiscussionsService
      .mockResolvedValueOnce({ success: true, data: [question("2", "Newest")], pagination: { nextCursor: "2" } })
      .mockResolvedValueOnce({ success: true, data: [question("1", "Older")], pagination: { nextCursor: null } });

    render(<CourseDiscussion courseId="c1" />);
    expect(await screen.findByText("Newest")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load older questions" }));
    expect(await screen.findByText("Older")).toBeInTheDocument();
    expect(fetchDiscussionsService).toHaveBeenLastCalledWith("c1", "2");
    expect(screen.queryByRole("button", { name: "Load older questions" })).not.toBeInTheDocument();
  });

  it("posts a question and shows it immediately", async () => {
    fetchDiscussionsService.mockResolvedValue({ success: true, data: [], pagination: { nextCursor: null } });
    addDiscussionQuestionService.mockResolvedValue({ success: true, data: question("9", "How do streams work?") });

    render(<CourseDiscussion courseId="c1" lectureId="l1" />);
    await userEvent.type(screen.getByLabelText("Ask a question"), "How do streams work?");
    await userEvent.click(screen.getByRole("button", { name: /post question/i }));

    expect(await screen.findByText("How do streams work?")).toBeInTheDocument();
    expect(addDiscussionQuestionService).toHaveBeenCalledWith("c1", "How do streams work?", "l1");
  });

  it("adds questions pushed live over the socket", async () => {
    fetchDiscussionsService.mockResolvedValue({ success: true, data: [], pagination: { nextCursor: null } });
    render(<CourseDiscussion courseId="c1" />);
    await waitFor(() => expect(listeners["discussion:new"]).toBeDefined());

    act(() => listeners["discussion:new"](question("5", "Live question")));
    expect(await screen.findByText("Live question")).toBeInTheDocument();
  });
});
