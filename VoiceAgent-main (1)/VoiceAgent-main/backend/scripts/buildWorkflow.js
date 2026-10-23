const payload = {
  name: 'Cold Calling Agent - Seagull',
  call_disposition_codes: {
    disposition_codes: ['interested', 'callback_requested', 'not_interested', 'wrong_number']
  },
  workflow_definition: {
    nodes: [
      {
        id: '0',
        type: 'globalNode',
        position: { x: -325, y: 480 },
        data: {
          name: 'Global Node',
          allow_interrupt: false,
          prompt: [
            "तुम्ही Priya आहात — Seagull Science Academy, Bhosari, Pune च्या Calling Team मधून.",
            "",
            "हा पहिला contact आहे. Goal: lead qualify करणे, admission sell नाही.",
            "",
            "CONTEXT:",
            "Name: {{customer_name | कोणाशी तरी}}",
            "Phone: {{customer_phone}}",
            "Course: {{course_interested}}",
            "Notes: {{notes}}",
            "",
            "LANGUAGE:",
            "Marathi बोला + daily English words freely वापरा — Student, Class, Coaching, Demo, Interested, Batch, Fees, Contact, Available, Counselor. Short sentences. Natural Pune-style.",
            "",
            "RULES:",
            "- एका वेळी एकच question",
            "- Fees ची detail नको",
            "- User interested असेल, तर free Demo Class schedule करण्यासाठी encourage करा आणि specific date/time विचारा.",
            "- Interest नसेल तर gracefully end करा",
            "- Busy असेल तर callback time घ्या",
            "",
            "CRM/MCP TOOL CALL RULES:",
            "- ONLY call `create_follow_up` (type: CALLBACK) if the user explicitly asks to be called back later (e.g. 'busy right now, call tomorrow').",
            "- If user is interested in coaching, call `create_warm_lead`. Note that `create_warm_lead` automatically schedules a DEMO_SCHEDULING task, so you do NOT need to call `create_follow_up` for demo scheduling.",
            "- If the user confirms a date and time for a free Demo Class, use the `schedule_appointment` tool (type: DEMO) to book it directly. Do NOT use `create_follow_up` for confirmed demos.",
            "",
            "OUTCOMES: interested | callback_requested | not_interested | wrong_number"
          ].join('\n')
        }
      },
      {
        id: '1',
        type: 'startCall',
        position: { x: 175, y: 60 },
        data: {
          name: 'Start Call',
          allow_interrupt: false,
          add_global_prompt: true,
          delayed_start: false,
          is_start: true,
          greeting_type: 'text',
          delayed_start_duration: 2,
          extraction_enabled: false,
          pre_call_fetch_enabled: false,
          prompt: [
            '"नमस्कार! मी Priya बोलतेय — Seagull Science Academy, Bhosari मधून. {{customer_name | आपण}} बोलतोय का?"',
            "",
            "जर हो:",
            '"एक-दोन minutes बोलता येईल का?"',
            "",
            "जर busy:",
            '"कधी call करू — कोणती वेळ convenient आहे?"',
            "",
            "जर wrong person / number:",
            "End call करा."
          ].join('\n')
        }
      },
      {
        id: '2',
        type: 'agentNode',
        position: { x: 615.5, y: 476 },
        data: {
          name: 'Main Agenda and Questions',
          allow_interrupt: false,
          add_global_prompt: true,
          extraction_enabled: true,
          extraction_prompt: '',
          extraction_variables: [
            {
              name: 'interest_level',
              type: 'string',
              prompt: 'How interested was the caller? Choose one: very_interested, somewhat_interested, not_interested, wrong_number'
            },
            {
              name: 'preferred_course',
              type: 'string',
              prompt: 'Which course did the caller show interest in? e.g. JEE, NEET, CET, Foundation, Board. Empty string if not mentioned.'
            },
            {
              name: 'student_class',
              type: 'string',
              prompt: 'What class or grade is the student in? e.g. 9th, 10th, 11th, 12th. Empty string if not mentioned.'
            },
            {
              name: 'callback_time',
              type: 'string',
              prompt: 'If caller asked for callback, what time? e.g. Saturday evening, tomorrow 5pm. Empty string if no callback requested.'
            },
            {
              name: 'currently_has_coaching',
              type: 'boolean',
              prompt: 'Did caller mention student is currently enrolled in any coaching? true or false.'
            }
          ],
          prompt: [
            "हळूहळू खालील माहिती घ्या:",
            "",
            '1. "Student कोणत्या class मध्ये आहे?"',
            '2. "JEE / NEET / CET / Foundation / Board — कशात interest आहे?"',
            '3. "सध्या कुठे Coaching चालू आहे का?"',
            '4. "एकदा free Demo class साठी यायला available आहे का? कोणत्या दिवशी आणि वेळी यायला आवडेल?"',
            "",
            "Interested असेल आणि Demo class साठी तयार असेल:",
            "- User ला सोयीस्कर असणारी विशिष्ट तारीख आणि वेळ (date/time) विचारा.",
            "- तारीख आणि वेळ confirm झाल्यावर, direct `schedule_appointment` tool (type: DEMO) call करा जेणेकरून Demo class schedule होईल.",
            "- 'Counselor details देतील' म्हणून demo scheduling सोडून देऊ नका — याच call मध्ये demo class schedule करा.",
            "",
            "Callback हवा असेल (उदा. user busy असेल किंवा नंतर बोलायचे असेल):",
            "- \"कोणत्या वेळी call केलं तर convenient होईल?\" हे विचारा आणि tool `create_follow_up` (type: CALLBACK) call करा.",
            "",
            "Interest नाही:",
            '"No problem! कधी information हवी असेल तर नक्की contact करा."',
            "",
            "एका वेळी एकच question. Pressure देऊ नका."
          ].join('\n')
        }
      },
      {
        id: '4',
        type: 'endCall',
        position: { x: 175, y: 900 },
        data: {
          name: 'End Call',
          allow_interrupt: false,
          add_global_prompt: false,
          is_end: true,
          extraction_enabled: false,
          extraction_prompt: '',
          extraction_variables: [],
          prompt: [
            "Interested:",
            '"Great! आमचा Counselor लवकरच contact करेल. Thanks for your time!"',
            "",
            "Callback:",
            '"ठीक आहे — [त्यांनी सांगितलेल्या वेळी] call करतो. Bye!"',
            "",
            "Not interested:",
            '"ठीक आहे, Thanks! काही लागलं तर नक्की call करा."',
            "",
            "Wrong number:",
            '"Sorry — चुकीचा number दिसतोय. Bye!"',
            "",
            "Disposition set करा आणि call end करा."
          ].join('\n')
        }
      }
    ],
    edges: [
      {
        animated: true,
        type: 'custom',
        source: '1',
        target: '2',
        id: '1-2',
        selected: false,
        data: {
          label: 'Move to Main Agenda',
          condition: 'Choose this when caller is available, introduction is done, and you are ready to qualify them.'
        }
      },
      {
        animated: true,
        type: 'custom',
        source: '1',
        target: '4',
        id: '1-4',
        selected: false,
        data: {
          label: 'End call early',
          condition: 'Choose this when caller is wrong person, wrong number, or does not want to continue from the start.'
        }
      },
      {
        animated: true,
        type: 'custom',
        source: '2',
        target: '4',
        id: '2-4',
        selected: false,
        data: {
          label: 'End call',
          condition: 'Choose this when qualification is complete — caller is interested, wants callback, or is not interested.'
        }
      }
    ],
    viewport: { x: 451.11, y: -245.9, zoom: 1.06 }
  }
};

process.stdout.write(JSON.stringify(payload));
