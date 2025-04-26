import {useEffect, useState} from 'react'
import { supabase } from '../supabaseClient'

function App() {
  const [session, setSession] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userOnline, setUserOnline] = useState([]);
    useEffect(()=>{
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    });

    return () => subscription.unsubscribe();

  }, []);

  // sign in
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    })
  }

  // signo out
  const signOut = async () => {
    const {error} = await supabase.auth.signOut();
    if(error){
      console.error("sign out error:", error.message);
      alert(`Error : ${error.message}`)
    }
  };

  useEffect(()=>{
    if(!session?.user){
      setUserOnline([]);
      return
    }
    const roomOne = supabase.channel("room_one",{
    config: {
      presence: {
        key: session?.user?.id,
      },
    },
  });
  roomOne.on("broadcast",{event: "message"}, (payload)=>{
    setMessages((prevMessages) => [...prevMessages, payload.payload] )
    console.log(messages);
  })
    // track user presence
    roomOne.subscribe(async (status) => {
      if(status === "SUBSCRIBED"){
        await roomOne.track({
        id: session?.user?.id,
        });
      }
    } )

    // handle user presence
    roomOne.on("presence", {event: "sync"}, ()=>{
      const state = roomOne.presenceState();
      setUserOnline(Object.keys(state));
    });

    return () => {
      roomOne.unsubscribe();
    }
    
    // send message
    
  }, [session])

  console.log(session);
  
  if(!session){
    return(
      <div className='w-full flex h-screen justify-center items-center'>
        <button onClick={signIn}>Sign in with Google to chat</button>
      </div>
    )
  }else{

  return (
    <div className='w-full flex h-screen justify-center items-center p-4'>
      <div className='border-[1px] border-gray-700 max-w-6xl w-full min-h-[600px] rounded-lg'>
        {/* Heading */}
        <div className='flex justify-between h-20 border-b-[1px] border-gray-700'>
          <div className='p-4'>
          <p className='text-gray-300'>signed in as {session?.user?.user_metadata?.name}</p>
          <p className='text-gray-300 italic text-sm'>{userOnline} users online</p>
        </div>
        <button onClick={signOut} className='m-2 sm:mt-4'>Sign out</button>
        </div>
        {/* main chat */}
        <div className='p-4 flex flex-col overflow-y-auto h-[500px]'>

        </div>
        {/* message input */}
        <form action="" className='flex flex-col sm:flex-row p-4 border-t-[1px] border-gray-700' >
          <input value={newMessage} onChange={(e)=> setNewMessage(e.target.value)} type="text" placeholder='Type a message...' className='p-2 w-full bg-[#00000040] rounded-lg' />
          <button className='mt-4 sm:mt-0 sm:ml-8 text-white max-h-12'>send</button>
        </form>
      </div>
    </div>
  )
}
}

export default App;
