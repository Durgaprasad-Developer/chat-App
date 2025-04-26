import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

function App() {
  const [session, setSession] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userOnline, setUserOnline] = useState([]);

  const chatContainerRef = useRef(null);
  const scroll = useRef();
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // sign in
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  // sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("sign out error:", error.message);
      alert(`Error : ${error.message}`);
    }
  };

  useEffect(() => {
    if (!session?.user) {
      setUserOnline([]);
      return;
    }
    const roomOne = supabase.channel("room_one", {
      config: {
        presence: {
          key: session?.user?.id,
        },
      },
    });
    roomOne.on("broadcast", { event: "message" }, (payload) => {
      setMessages((prevMessages) => [...prevMessages, payload.payload]);
      console.log(messages);
    });
    // track user presence
    roomOne.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await roomOne.track({
          id: session?.user?.id,
        });
      }
    });

    // handle user presence
    roomOne.on("presence", { event: "sync" }, () => {
      const state = roomOne.presenceState();
      setUserOnline(Object.keys(state));
    });

    return () => {
      roomOne.unsubscribe();
    };
  }, [session]);

  // send message
  const sendMessage = async (e) => {
    e.preventDefault();

    supabase.channel("room_one").send({
      type: "broadcast",
      event: "message",
      payload: {
        message: newMessage,
        user_name: session?.user?.user_metadata?.email,
        avatar: session?.user?.user_metadata?.avatar_url,
        timestamp: new Date().toISOString(),
      },
    });
    setNewMessage("");
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString(`en-us`, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(()=>{
    setTimeout(() => {
      if(chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    },[100])
  },[messages])

  if (!session) {
    return (
      <div className="w-full flex h-screen justify-center items-center">
        <button onClick={signIn}>Sign in with Google to chat</button>
      </div>
    );
  } else {
    return (
      <div className="w-full flex h-screen justify-center items-center p-4">
        <div className="border-[1px] border-gray-700 max-w-6xl w-full min-h-[600px] rounded-lg">
          {/* Heading */}
          <div className="flex justify-between h-20 border-b-[1px] border-gray-700">
            <div className="p-4">
              <p className="text-gray-300">
                signed in as {session?.user?.user_metadata?.name}
              </p>
              <p className="text-gray-300 italic text-sm">
                {userOnline.length} users online
              </p>
            </div>
            <button onClick={signOut} className="m-2 sm:mt-4">
              Sign out
            </button>
          </div>

          {/* main chat */}
          <div ref={chatContainerRef} className="p-4 flex flex-col overflow-y-auto h-[500px]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`my-2 flex w-full item-start ${
                  msg?.user_name === session?.user?.email
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {/* recived message - avatar on left */}
                {msg?.user_name !== session?.user?.email && (
                  <img
                    className="w-6 h-6 rounded-full mr-2"
                    src={msg.avatar}
                    alt="/"
                  />
                )}

                <div className="flex flex-col w-full">
                  <div
                    className={`p-1 max-w-{70%} rounded-xl ${
                      msg?.user_name === session?.user?.email
                        ? "bg-gray-700 text-white ml-auto"
                        : "bg-gray-500 text-white mr-auto"
                    }`}
                  >
                    <p>{msg.message}</p>
                  </div>

                  {/* timestamp */}
                  <div
                    className={`text-xs opacity-75 pt-1 ${
                      msg?.user_name === session?.user?.email
                        ? "text-right mr-2"
                        : "text-left ml-2"
                    }`}
                  >
                    {formatTime(msg?.timestamp)}
                  </div>
                </div>
                {msg?.user_name === session?.user?.email && (
                  <img
                    className="w-6 h-6 rounded-full ml-2"
                    src={msg.avatar}
                    alt="/"
                  />
                )}
              </div>
            ))}
          </div>

          {/* message input */}
          <form
            onSubmit={sendMessage}
            className="flex flex-col sm:flex-row p-4 border-t-[1px] border-gray-700"
          >
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              type="text"
              placeholder="Type a message..."
              className="p-2 w-full bg-[#00000040] rounded-lg"
            />
            <button className="mt-4 sm:mt-0 sm:ml-8 text-white max-h-12 bg-gray-800 p-2 rounded-md hover:bg-gray-700 sm:bg-transparent sm:hover:bg-gray-700">
              send
            </button>
            <span ref={scroll}></span>
          </form>
        </div>
      </div>
    );
  }
}

export default App;
