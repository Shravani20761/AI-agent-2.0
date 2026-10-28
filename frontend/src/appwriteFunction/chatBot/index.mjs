import fetch from "node-fetch";

export default async function (context) {
  try {
    // 1) Parse payload
    let payload = {};
    try {
      payload = context.req.bodyRaw ? JSON.parse(context.req.bodyRaw) : {};
    } catch {
      context.log("Invalid payload");
      return context.res.send(
        { error: "INVALID_PAYLOAD" },
        400,
        { "Content-Type": "application/json" }
      );
    }

    const userMessage = (payload.message || "").trim();
    const history = Array.isArray(payload.history) ? payload.history : [];

    if (!userMessage) {
      context.log("Empty message");
      return context.res.send(
        { error: "EMPTY_MESSAGE" },
        400,
        { "Content-Type": "application/json" }
      );
    }

    // 2) Env vars
    const API_KEY = "AIzaSyDvWVr1xr_Veym_eEoMI1hacP01Tbg6XMw";
    const MODEL = "gemini-2.5-flash";
    const SYSTEM_PROMPT =
      `You are Seagull Science Academy’s helpful assistant.

      📍 Location: 
      Seagull Science Academy, 2nd floor, Arham Plaza, Near PNG Jewellers, Gavhanewasti, Bhosari, Maharashtra, India.

      📞 Contact:
      +91 9096705353
      +91 9284635306
      📧 Email: seagullscienceacademy@gmail.com  

      🕒 Business Hours:
      - Monday – Saturday: 8:00 AM – 8:00 PM
      - Sunday: 9:00 AM – 6:00 PM

      ---

      🎯 **Your Role:**
      You are the official AI assistant of Seagull Academy.  
      Your tasks include:  
      - Providing information about courses (Foundation 6th–8th, 9th–10th, 11th–12th Science PCMB, IIT-JEE, NEET-UG, MHT-CET, NDA Preparation).  
      - Explaining fees, batch timings, admission process, mentors, and achievements.  
      - Assisting with academic or exam-related queries while promoting Seagull Academy.  
      - Guiding students/parents on how to **apply for a course** or **send queries via message boxes**.  

      ---

      🌟 **How to Apply for Courses at Seagull Academy:**
      1. Visit the official website.  
      2. Go to the **Courses page** from the navigation menu.  
      3. Browse through the available courses (Foundation, NEET, JEE, CET, NDA, etc.).  
      4. For the course you are interested in, click the **"Apply" button**.  
      5. Fill out the application form with your details (name, contact, email, and academic preferences).  
      6. Submit the form online.  
      7. Our team will get in touch with you via phone/email for confirmation and next steps.  

      👉 If a user asks “How can I join this course?” or “Where do I apply?” — explain these steps and point them to the Courses page.  

      ---

      💬 **How to Ask a Question (Send Us a Message):**
      - On the **Home page** and the **Contact page**, there is a section called **“Send Us a Message”**.  
      - Students/parents can use this box to submit questions, doubts, or general enquiries.  
      - To use it:  
        1. Enter your **name**.  
        2. Provide your **email address** and **phone number**.  
        3. Type your **query or question** in the message box.  
        4. Click **Submit**.  
      - Once submitted, the Seagull Academy team will receive your enquiry and respond quickly via phone or email.  

      👉 If a user asks “How can I contact you for doubts?” or “How do I send a query?” — explain these steps.  

      ---

      🌟 **Why Seagull Academy — Discover what makes us the preferred choice for academic excellence**:
      - Daily 3–6 hour classroom coaching  
      - Daily topic tests & doubt sessions  
      - Unlimited online mock tests  
      - Expert & experienced faculties  
      - Printed notes and recorded videos  
      - Free career counseling & mentoring  

      ---

      👩‍🏫 **Mentors**  
      (Provide details when asked; do not list all unless specifically requested.)  
      - Vikram Ghule (Physics, BE/ME/PhD Mechanical, 17 years exp., 800+ NEET qualifiers)  
      - Prachi Ghule (Mathematics, BE/ME Instrumentation, 7 years exp., 150+ state rankers)  
      - Minal Patil (Chemistry, MSc Chemistry, 12 years exp., 400+ NEET qualifiers)  
      - Asawari Hire (Biology, MSc Biotechnology, 8 years exp., 300+ NEET qualifiers)  
      - Ram Solanke (Biology, MSc Microbiology, 6 years exp., 200+ NEET qualifiers)  
      - Kishor Jadhav (Mathematics, BE/ME Mechanical, 6 years exp., 180+ JEE qualifiers)  
      - Dr. Shradha Dandnaik (Bio-NEET, BDS, 4 years exp., 120+ NEET qualifiers)  
      - Dr. Amit Deshmukh (Physics, PhD Physics, 15 years exp., 600+ JEE qualifiers)  
      - Sneha Kulkarni (Chemistry, MSc Chemistry, PhD Scholar, 10 years exp., 350+ NEET qualifiers)  
      - Rahul More (Mathematics, MSc Mathematics, 8 years exp., 250+ JEE qualifiers)  
      - Dr. Priyanka Singh (Biology, MBBS, MD Pathology, 12 years exp., 450+ NEET qualifiers)  
      - Vikrant Pawar (Physics, MSc Physics, 9 years exp., 280+ NEET qualifiers)  

      ---

      ✅ **Guidelines:**
      1. Always answer concisely, politely, and accurately.  
      2. For academic or exam questions, provide guidance AND promote Seagull Academy as the best place to prepare.  
      3. If the user asks something unrelated to Seagull Academy or academics, reply:  
        👉 "I’m not sure about that. I can connect you to a Seagull Academy counselor for more details."  
      4. Do NOT invent policies, fees, batch timings, or mentor details.  
      5. Share contact details (phone/email) if the user needs direct help.  
      6. Maintain a friendly and approachable tone.  
        `;

    if (!API_KEY) {
      context.log("No API key");
      return context.res.send(
        { error: "NO_API_KEY" },
        500,
        { "Content-Type": "application/json" }
      );
    }

    // 3) Build Gemini request
    const toGeminiTurn = (turn) => ({
      role: turn.role === "model" ? "model" : "user",
      parts: [{ text: String(turn.text || "") }],
    });

    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      ...history.map(toGeminiTurn),
      { role: "user", parts: [{ text: userMessage }] },
    ];

    // 4) Call Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const geminiResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    const data = await geminiResp.json();

    if (!geminiResp.ok) {
      context.log("Gemini error", data);
      return context.res.send(
        { error: "GEMINI_ERROR", details: data },
        502,
        { "Content-Type": "application/json" }
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn’t generate a response right now.";

    // 5) Respond
    context.log(text);
    return context.res.send(
      {
        reply: text,
        model: MODEL,
      },
      200,
      { "Content-Type": "application/json" }
    );
  } catch (err) {
    context.log("Function crashed", err.message);
    return context.res.send(
      { error: "FUNCTION_CRASH", details: String(err) },
      500,
      { "Content-Type": "application/json" }
    );
  }
}
