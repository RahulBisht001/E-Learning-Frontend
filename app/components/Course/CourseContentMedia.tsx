import {styles} from "@/app/styles/style";
import CoursePlayer from "@/app/utils/CoursePlayer";
import {
    useAddAnswerInQuestionMutation,
    useAddNewQuestionMutation,
    useAddReplyInReviewMutation,
    useAddReviewInCourseMutation,
    useGetCourseDetailsQuery,
} from "@/redux/features/courses/coursesApi";
import Image from "next/image";
import {format} from "timeago.js";
import React, {useEffect, useState} from "react";
import {toast} from "react-hot-toast";
import {AiFillStar, AiOutlineArrowLeft, AiOutlineArrowRight, AiOutlineStar} from "react-icons/ai";
import {BiMessage} from "react-icons/bi";
import {VscVerifiedFilled, VscSend} from "react-icons/vsc";
import {BsStars} from "react-icons/bs";
import Ratings from "@/app/utils/Ratings";
import socketIO from "socket.io-client";
import ReactMarkdown from "react-markdown";

const ENDPOINT = process.env.NEXT_PUBLIC_SOCKET_SERVER_URI || "";
const socketId = socketIO(ENDPOINT, {transports: ["websocket"]});

type Props = {
    data: any;
    id: string;
    activeVideo: number;
    setActiveVideo: (activeVideo: number) => void;
    user: any;
    refetch: any;
};

const CourseContentMedia = ({data, id, activeVideo, setActiveVideo, user, refetch}: Props) => {
    const [activeBar, setactiveBar] = useState(0);
    const [question, setQuestion] = useState("");
    const [review, setReview] = useState("");
    const [rating, setRating] = useState(1);
    const [answer, setAnswer] = useState("");
    const [questionId, setQuestionId] = useState("");
    const [reply, setReply] = useState("");
    const [reviewId, setReviewId] = useState("");
    const [isReviewReply, setIsReviewReply] = useState(false);

    const [addNewQuestion, {isSuccess, error, isLoading: questionCreationLoading}] = useAddNewQuestionMutation();
    const {data: courseData, refetch: courseRefetch} = useGetCourseDetailsQuery(id, {refetchOnMountOrArgChange: true});
    const [addAnswerInQuestion, {isSuccess: answerSuccess, error: answerError, isLoading: answerCreationLoading}] =
        useAddAnswerInQuestionMutation();
    const course = courseData?.course;
    const [addReviewInCourse, {isSuccess: reviewSuccess, error: reviewError, isLoading: reviewCreationLoading}] =
        useAddReviewInCourseMutation();

    const [addReplyInReview, {isSuccess: replySuccess, error: replyError, isLoading: replyCreationLoading}] =
        useAddReplyInReviewMutation();

    // New

    type CourseContextType = {
        title: string;
        description: string;
        chapters: {title: string; description: string}[];
    };

    const fallbackCourseContext: CourseContextType = {
        title: "General Course",
        description: "Act as a tutor and answer questions based on the course content.",
        chapters: [
            {
                title: "General Guidance",
                description: "Please ask questions related to the course content.",
            },
        ],
    };

    const [showAIModal, setShowAIModal] = useState(false);
    const [courseContext, setCourseContext] = useState<CourseContextType | null>(null);
    const [chatMessages, setChatMessages] = useState<{role: "user" | "ai"; text: string}[]>([]);
    const [userInput, setUserInput] = useState("");

    const fetchCourseContext = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URI}/ai/context/${id}`);
            const data = await res.json();

            console.log(JSON.stringify(data));

            setCourseContext({
                title: data.title,
                description: data.description,
                chapters: data.chapters.map((ch: any) => ({
                    title: ch.title,
                    description: ch.description,
                })),
            });
        } catch (err) {
            console.error("Failed to load course context:", err);
            setCourseContext(fallbackCourseContext);
        }
    };

    const handleOpenAIModal = () => {
        setShowAIModal(true);
        if (!courseContext) {
            fetchCourseContext();
        } // fetch only once per course view
    };

    const handleCloseAIModal = () => {
        setShowAIModal(false);
        setChatMessages([]); // clear chat history
        setUserInput("");
    };

    // New

    const isReviewExists = course?.reviews?.find((item: any) => item.user._id === user._id);

    const handleQuestion = () => {
        if (question.length === 0) {
            toast.error("Question can't be empty");
        } else {
            addNewQuestion({
                question,
                courseId: id,
                contentId: data[activeVideo]._id,
            });
        }
    };

    useEffect(() => {
        if (isSuccess) {
            setQuestion("");
            refetch();
            socketId.emit("notification", {
                title: `New Question Received`,
                message: `You have a new question in ${data[activeVideo].title}`,
                userId: user._id,
            });
        }
        if (answerSuccess) {
            setAnswer("");
            refetch();
            if (user.role !== "admin") {
                socketId.emit("notification", {
                    title: `New Reply Received`,
                    message: `You have a new question in ${data[activeVideo].title}`,
                    userId: user._id,
                });
            }
        }
        if (error) {
            if ("data" in error) {
                const errorMessage = error as any;
                toast.error(errorMessage.data.message);
            }
        }
        if (answerError) {
            if ("data" in answerError) {
                const errorMessage = error as any;
                toast.error(errorMessage.data.message);
            }
        }
        if (reviewSuccess) {
            setReview("");
            setRating(1);
            courseRefetch();
            socketId.emit("notification", {
                title: `New Question Received`,
                message: `You have a new question in ${data[activeVideo].title}`,
                userId: user._id,
            });
        }
        if (reviewError) {
            if ("data" in reviewError) {
                const errorMessage = error as any;
                toast.error(errorMessage.data.message);
            }
        }
        if (replySuccess) {
            setReply("");
            courseRefetch();
        }
        if (replyError) {
            if ("data" in replyError) {
                const errorMessage = error as any;
                toast.error(errorMessage.data.message);
            }
        }
    }, [isSuccess, error, answerSuccess, answerError, reviewSuccess, reviewError, replySuccess, replyError]);

    const handleAnswerSubmit = () => {
        addAnswerInQuestion({
            answer,
            courseId: id,
            contentId: data[activeVideo]._id,
            questionId: questionId,
        });
    };

    const handleReviewSubmit = async () => {
        if (review.length === 0) {
            toast.error("Review can't be empty");
        } else {
            addReviewInCourse({review, rating, courseId: id});
        }
    };

    const handleReviewReplySubmit = () => {
        if (!replyCreationLoading) {
            if (reply === "") {
                toast.error("Reply can't be empty");
            } else {
                addReplyInReview({comment: reply, courseId: id, reviewId});
            }
        }
    };

    return (
        <div className="w-[95%] 800px:w-[86%] py-4 m-auto">
            <CoursePlayer title={data[activeVideo]?.title} videoUrl={data[activeVideo]?.videoUrl} />
            <div className="w-full flex items-center justify-between my-3">
                <div
                    className={`${styles.button} text-white  !w-[unset] !min-h-[40px] !py-[unset] ${
                        activeVideo === 0 && "!cursor-no-drop opacity-[.8]"
                    }`}
                    onClick={() => setActiveVideo(activeVideo === 0 ? 0 : activeVideo - 1)}
                >
                    <AiOutlineArrowLeft className="mr-2" />
                    Prev Lesson
                </div>

                <div className={`${styles.button} !w-[unset] !bg-red-500`} onClick={handleOpenAIModal}>
                    Ask AI
                    <BsStars className="ml-2" />
                </div>

                <div
                    className={`${styles.button} !w-[unset] text-white  !min-h-[40px] !py-[unset] ${
                        data.length - 1 === activeVideo && "!cursor-no-drop opacity-[.8]"
                    }`}
                    onClick={() =>
                        setActiveVideo(data && data.length - 1 === activeVideo ? activeVideo : activeVideo + 1)
                    }
                >
                    Next Lesson
                    <AiOutlineArrowRight className="ml-2" />
                </div>
            </div>
            <h1 className="pt-2 text-[25px] font-[600] dark:text-white text-black ">{data[activeVideo].title}</h1>
            <br />
            <div className="w-full p-4 flex items-center justify-between bg-slate-500 bg-opacity-20 backdrop-blur shadow-[bg-slate-700] rounded shadow-inner">
                {["Overview", "Resources", "Q&A", "Reviews"].map((text, index) => (
                    <h5
                        key={index}
                        className={`800px:text-[20px] cursor-pointer ${
                            activeBar === index ? "text-red-500" : "dark:text-white text-black"
                        }`}
                        onClick={() => setactiveBar(index)}
                    >
                        {text}
                    </h5>
                ))}
            </div>
            <br />
            {activeBar === 0 && (
                <p className="text-[18px] whitespace-pre-line mb-3 dark:text-white text-black">
                    {data[activeVideo]?.description}
                </p>
            )}

            {activeBar === 1 && (
                <div>
                    {data[activeVideo]?.links.map((item: any, index: number) => (
                        <div className="mb-5" key={index}>
                            <h2 className="800px:text-[20px] 800px:inline-block dark:text-white text-black">
                                {item.title && item.title + " :"}
                            </h2>
                            <a className="inline-block text-[#4395c4] 800px:text-[20px] 800px:pl-2" href={item.url}>
                                {item.url}
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {activeBar === 2 && (
                <>
                    <div className="flex w-full">
                        <Image
                            src={
                                user.avatar
                                    ? user.avatar.url
                                    : "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png"
                            }
                            width={50}
                            height={50}
                            alt=""
                            className="w-[50px] h-[50px] rounded-full object-cover"
                        />
                        <textarea
                            name=""
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            id=""
                            cols={40}
                            rows={5}
                            placeholder="Write your question..."
                            className="outline-none bg-transparent ml-3 border dark:text-white text-black border-[#0000001d] dark:border-[#ffffff57] 800px:w-full p-2 rounded w-[90%] 800px:text-[18px] font-Poppins"
                        ></textarea>
                    </div>
                    <div className="w-full flex justify-end">
                        <div
                            className={`${styles.button} !w-[120px] !h-[40px] text-[18px] mt-5 ${
                                questionCreationLoading && "cursor-not-allowed"
                            }`}
                            onClick={questionCreationLoading ? () => {} : handleQuestion}
                        >
                            Submit
                        </div>
                    </div>
                    <br />
                    <br />
                    <div className="w-full h-[1px] bg-[#ffffff3b]"></div>
                    <div>
                        <CommentReply
                            data={data}
                            activeVideo={activeVideo}
                            answer={answer}
                            setAnswer={setAnswer}
                            handleAnswerSubmit={handleAnswerSubmit}
                            user={user}
                            questionId={questionId}
                            setQuestionId={setQuestionId}
                            answerCreationLoading={answerCreationLoading}
                        />
                    </div>
                </>
            )}

            {activeBar === 3 && (
                <div className="w-full">
                    <>
                        {!isReviewExists && (
                            <>
                                <div className="flex w-full">
                                    <Image
                                        src={
                                            user.avatar
                                                ? user.avatar.url
                                                : "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png"
                                        }
                                        width={50}
                                        height={50}
                                        alt=""
                                        className="w-[50px] h-[50px] rounded-full object-cover"
                                    />
                                    <div className="w-full">
                                        <h5 className="pl-3 text-[20px] font-[500] dark:text-white text-black ">
                                            Give a Rating <span className="text-red-500">*</span>
                                        </h5>
                                        <div className="flex w-full ml-2 pb-3">
                                            {[1, 2, 3, 4, 5].map((i) =>
                                                rating >= i ? (
                                                    <AiFillStar
                                                        key={i}
                                                        className="mr-1 cursor-pointer"
                                                        color="rgb(246,186,0)"
                                                        size={25}
                                                        onClick={() => setRating(i)}
                                                    />
                                                ) : (
                                                    <AiOutlineStar
                                                        key={i}
                                                        className="mr-1 cursor-pointer"
                                                        color="rgb(246,186,0)"
                                                        size={25}
                                                        onClick={() => setRating(i)}
                                                    />
                                                )
                                            )}
                                        </div>
                                        <textarea
                                            name=""
                                            value={review}
                                            onChange={(e) => setReview(e.target.value)}
                                            id=""
                                            cols={40}
                                            rows={5}
                                            placeholder="Write your comment..."
                                            className="outline-none bg-transparent 800px:ml-3 dark:text-white text-black border border-[#00000027] dark:border-[#ffffff57] w-[95%] 800px:w-full p-2 rounded text-[18px] font-Poppins"
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="w-full flex justify-end">
                                    <div
                                        className={`${
                                            styles.button
                                        } !w-[120px] !h-[40px] text-[18px] mt-5 800px:mr-0 mr-2 ${
                                            reviewCreationLoading && "cursor-no-drop"
                                        }`}
                                        onClick={reviewCreationLoading ? () => {} : handleReviewSubmit}
                                    >
                                        Submit
                                    </div>
                                </div>
                            </>
                        )}
                        <br />
                        <div className="w-full h-[1px] bg-[#ffffff3b]"></div>
                        <div className="w-full">
                            {(course?.reviews && [...course.reviews].reverse())?.map((item: any, index: number) => {
                                return (
                                    <div className="w-full my-5 dark:text-white text-black" key={index}>
                                        <div className="w-full flex">
                                            <div>
                                                <Image
                                                    src={
                                                        item.user.avatar
                                                            ? item.user.avatar.url
                                                            : "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png"
                                                    }
                                                    width={50}
                                                    height={50}
                                                    alt=""
                                                    className="w-[50px] h-[50px] rounded-full object-cover"
                                                />
                                            </div>
                                            <div className="ml-2">
                                                <h1 className="text-[18px]">{item?.user.name}</h1>
                                                <Ratings rating={item.rating} />
                                                <p>{item.comment}</p>
                                                <small className="text-[#0000009e] dark:text-[#ffffff83]">
                                                    {format(item.createdAt)} •
                                                </small>
                                            </div>
                                        </div>
                                        {user.role === "admin" && item.commentReplies.length === 0 && (
                                            <span
                                                className={`${styles.label} !ml-10 cursor-pointer`}
                                                onClick={() => {
                                                    setIsReviewReply(true);
                                                    setReviewId(item._id);
                                                }}
                                            >
                                                Add Reply
                                            </span>
                                        )}

                                        {isReviewReply && reviewId === item._id && (
                                            <div className="w-full flex relative">
                                                <input
                                                    type="text"
                                                    placeholder="Enter your reply..."
                                                    value={reply}
                                                    onChange={(e: any) => setReply(e.target.value)}
                                                    className="block 800px:ml-12 mt-2 outline-none bg-transparent border-b border-[#000] dark:border-[#fff] p-[5px] w-[95%]"
                                                />
                                                <button
                                                    type="submit"
                                                    className="absolute right-0 bottom-1"
                                                    onClick={handleReviewReplySubmit}
                                                >
                                                    Submit
                                                </button>
                                            </div>
                                        )}

                                        {item.commentReplies.map((i: any, index: number) => (
                                            <div className="w-full flex 800px:ml-16 my-5" key={index}>
                                                <div className="w-[50px] h-[50px]">
                                                    <Image
                                                        src={
                                                            i.user.avatar
                                                                ? i.user.avatar.url
                                                                : "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png"
                                                        }
                                                        width={50}
                                                        height={50}
                                                        alt=""
                                                        className="w-[50px] h-[50px] rounded-full object-cover"
                                                    />
                                                </div>
                                                <div className="pl-2">
                                                    <div className="flex items-center">
                                                        <h5 className="text-[20px]">{i.user.name}</h5>{" "}
                                                        <VscVerifiedFilled className="text-[#0095F6] ml-2 text-[20px]" />
                                                    </div>
                                                    <p>{i.comment}</p>
                                                    <small className="text-[#ffffff83]">{format(i.createdAt)} •</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                </div>
            )}

            {showAIModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 font-Poppins">
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl w-[90%] max-w-[1000px] h-[80%] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-semibold text-black dark:text-white">
                                Ask AI (Course Assistant)
                            </h2>
                            <button onClick={handleCloseAIModal} className="text-red-600 font-bold text-lg">
                                ×
                            </button>
                        </div>

                        {/* <div className="flex-1 overflow-y-auto space-y-3 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm">
                            {chatMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`p-2 rounded-xl ${
                                        msg.role === "user"
                                            ? "dark:text-white text-black"
                                            : " dark:text-white text-black"
                                    } dark:bg-opacity-20`}
                                >
                                    {msg.role === "user" ? "You" : "AI"} :&nbsp; {msg.text}
                                </div>
                            ))}
                        </div> */}

                        <div className="flex-1 overflow-y-auto space-y-3 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className="flex items-start space-x-3">
                                    <img
                                        src={
                                            msg.role === "user" ? "/assests/user-avatar.png" : "/assests/bot-avatar.png"
                                        }
                                        alt={msg.role === "user" ? "User" : "Bot"}
                                        className="w-10 h-10 rounded-full "
                                    />
                                    <div
                                        className={`p-2 rounded-xl max-w-[80%] ${
                                            msg.role === "user" ? "bg-blue-400 text-black" : "bg-white text-gray-900"
                                        }`}
                                    >
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        {/* {msg.text} */}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!userInput.trim()) return;

                                const userMessage = {role: "user" as "user", text: userInput};

                                setChatMessages((prev) => [...prev, userMessage]);

                                const systemPrompt = `
                                You are an expert tutor helping a student with the course: "${courseContext?.title}".

                                Your primary job is to answer questions related to this course and its topics.
                                You may also answer questions from closely related areas if they help the student better understand this course.
                                Avoid answering questions that are clearly unrelated to this subject.

                                If a question is off-topic, respond with:
                                "Sorry, I can only help with questions related to the '${courseContext?.title}' course."

                                Course Description:
                                ${courseContext?.description}

                                Chapters:
                                ${courseContext?.chapters
                                .map((ch, i) => `${i + 1}. ${ch.title} — ${ch.description}`)
                                .join("\n")}
                                `.trim();

                                const messages = [
                                    {role: "system", content: systemPrompt},
                                    {role: "user", content: userInput},
                                ];

                                try {
                                    const res = await fetch(process.env.NEXT_PUBLIC_SERVER_URI + "/ai/ask", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({messages}),
                                    });

                                    const data = await res.json();
                                    // const aiText =
                                    //     data?.choices?.[0]?.message?.content ?? "Sorry, I didn't understand.";
                                    const aiText = data?.reply ?? "Sorry, I didn't understand.";
                                    setChatMessages((prev) => [...prev, {role: "ai", text: aiText}]);
                                    setUserInput("");
                                } catch (err) {
                                    console.error(err);
                                    setChatMessages((prev) => [
                                        ...prev,
                                        {role: "ai", text: "Error reaching AI server."},
                                    ]);
                                }
                            }}
                            className="mt-2 flex text-sm"
                        >
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Ask your question..."
                                className="flex-1 p-2 px-4 rounded-xl dark:text-white outline-none text-black border border-black mr-4"
                            />
                            <button
                                type="submit"
                                className="bg-none text-black border border-black dark:border-white dark:text-white px-4 rounded-xl flex flex-row justify-center items-center gap-2"
                            >
                                Ask
                                <VscSend />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const CommentReply = ({
    data,
    activeVideo,
    answer,
    setAnswer,
    handleAnswerSubmit,
    questionId,
    setQuestionId,
    answerCreationLoading,
}: any) => {
    return (
        <>
            <div className="w-full my-3">
                {data[activeVideo].questions.map((item: any, index: any) => (
                    <CommentItem
                        key={index}
                        data={data}
                        activeVideo={activeVideo}
                        item={item}
                        index={index}
                        answer={answer}
                        setAnswer={setAnswer}
                        questionId={questionId}
                        setQuestionId={setQuestionId}
                        handleAnswerSubmit={handleAnswerSubmit}
                        answerCreationLoading={answerCreationLoading}
                    />
                ))}
            </div>
        </>
    );
};

const CommentItem = ({
    questionId,
    setQuestionId,
    item,
    answer,
    setAnswer,
    handleAnswerSubmit,
    answerCreationLoading,
}: any) => {
    const [replyActive, setreplyActive] = useState(false);
    return (
        <>
            <div className="my-4">
                <div className="flex mb-2">
                    <div>
                        <Image
                            src={
                                item.user.avatar
                                    ? item.user.avatar.url
                                    : "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png"
                            }
                            width={50}
                            height={50}
                            alt=""
                            className="w-[50px] h-[50px] rounded-full object-cover"
                        />
                    </div>
                    <div className="pl-3 dark:text-white text-black">
                        <h5 className="text-[20px]">{item?.user.name}</h5>
                        <p>{item?.question}</p>
                        <small className="text-[#000000b8] dark:text-[#ffffff83]">
                            {!item.createdAt ? "" : format(item?.createdAt)} •
                        </small>
                    </div>
                </div>
                <div className="w-full flex">
                    <span
                        className="800px:pl-16 text-[#000000b8] dark:text-[#ffffff83] cursor-pointer mr-2"
                        onClick={() => {
                            setreplyActive(!replyActive);
                            setQuestionId(item._id);
                        }}
                    >
                        {!replyActive
                            ? item.questionReplies.length !== 0
                                ? "All Replies"
                                : "Add Reply"
                            : "Hide Replies"}
                    </span>
                    <BiMessage size={20} className="dark:text-[#ffffff83] cursor-pointer text-[#000000b8]" />
                    <span className="pl-1 mt-[-4px] cursor-pointer text-[#000000b8] dark:text-[#ffffff83]">
                        {item.questionReplies.length}
                    </span>
                </div>

                {replyActive && questionId === item._id && (
                    <>
                        {item.questionReplies.map((item: any) => (
                            <div className="w-full flex 800px:ml-16 my-5 text-black dark:text-white" key={item._id}>
                                <div>
                                    <Image
                                        src={
                                            item.user.avatar
                                                ? item.user.avatar.url
                                                : "https://res.cloudinary.com/dshp9jnuy/image/upload/v1665822253/avatars/nrxsg8sd9iy10bbsoenn.png"
                                        }
                                        width={50}
                                        height={50}
                                        alt=""
                                        className="w-[50px] h-[50px] rounded-full object-cover"
                                    />
                                </div>
                                <div className="pl-3">
                                    <div className="flex items-center">
                                        <h5 className="text-[20px]">{item.user.name}</h5>{" "}
                                        {item.user.role === "admin" && (
                                            <VscVerifiedFilled className="text-[#0095F6] ml-2 text-[20px]" />
                                        )}
                                    </div>
                                    <p>{item.answer}</p>
                                    <small className="text-[#ffffff83]">{format(item.createdAt)} •</small>
                                </div>
                            </div>
                        ))}
                        <>
                            <div className="w-full flex relative dark:text-white text-black">
                                <input
                                    type="text"
                                    placeholder="Enter your answer..."
                                    value={answer}
                                    onChange={(e: any) => setAnswer(e.target.value)}
                                    className={`block 800px:ml-12 mt-2 outline-none bg-transparent border-b border-[#00000027] dark:text-white text-black dark:border-[#fff] p-[5px] w-[95%] ${
                                        answer === "" || (answerCreationLoading && "cursor-not-allowed")
                                    }`}
                                />
                                <button
                                    type="submit"
                                    className="absolute right-0 bottom-1"
                                    onClick={handleAnswerSubmit}
                                    disabled={answer === "" || answerCreationLoading}
                                >
                                    Submit
                                </button>
                            </div>
                            <br />
                        </>
                    </>
                )}
            </div>
        </>
    );
};

export default CourseContentMedia;
