(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();async function e(e){let t=await e.text();if(!t)return null;try{return JSON.parse(t)}catch{return null}}function t(e,t){if(e&&typeof e==`object`&&`error`in e){let t=e.error;if(typeof t==`string`&&t)return t}return t}async function n(n,r,i=`gpt-4o-mini`){let a=await fetch(`/api/improve-prompt`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({userPrompt:n,systemPrompt:r,model:i})}),o=await e(a);if(!a.ok)throw Error(t(o,`AI error: ${a.status}`));if(!o?.content)throw Error(`AI returned an empty response`);return o.content}var r=`reference.png`,i=.72,a=35,o=5;async function s(n,i,a,o,s){let l=o?u(o):null,d=await fetch(`/api/runpod-generate`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({workflow:f(n,i,a,!!l),...l?{images:[{name:r,image:l}]}:{}})}),p=await e(d);if(!d.ok)throw Error(t(p,`RunPod error: ${d.status}`));if(!p?.id)throw Error(`RunPod returned no job id`);return await c(p.id,s)}async function c(n,r){for(let i=0;i<60;i++){await l(3e3),r?.(i+1,60);let a=await fetch(`/api/runpod-status?id=${encodeURIComponent(n)}`),o=await e(a);if(!a.ok)throw Error(t(o,`Status check error: ${a.status}`));if(!o)throw Error(`RunPod status returned an empty response`);if(console.log(`Job status:`,o.status,`attempt:`,i+1),o.status===`COMPLETED`){let e=d(o);if(!e)throw Error(`No image in response`);return e}if(o.status===`FAILED`)throw Error(o.error||`Image generation failed on Runpod`)}throw Error(`Generation timeout after 3 minutes`)}function l(e){return new Promise(t=>setTimeout(t,e))}function u(e){return e.replace(/^data:image\/\w+;base64,/,``)}function d(e){let t=e.output?.message;if(t)return t.startsWith(`data:image/`)?t:`data:image/png;base64,${t}`;let n=e.output?.images?.[0];return typeof n==`string`?n.startsWith(`data:image/`)?n:`data:image/png;base64,${n}`:n?.data?n.data.startsWith(`data:image/`)?n.data:`data:image/png;base64,${n.data}`:e.output?.image_url||null}function f(e,t,n,s){let c={6:{inputs:{text:e,clip:[`30`,1]},class_type:`CLIPTextEncode`,_meta:{title:`CLIP Text Encode (Positive Prompt)`}},8:{inputs:{samples:[`31`,0],vae:[`30`,2]},class_type:`VAEDecode`,_meta:{title:`VAE Decode`}},27:{inputs:{width:n.width,height:n.height,batch_size:1},class_type:`EmptySD3LatentImage`,_meta:{title:`EmptySD3LatentImage`}},30:{inputs:{ckpt_name:`flux1-dev-fp8.safetensors`},class_type:`CheckpointLoaderSimple`,_meta:{title:`Load Checkpoint`}},31:{inputs:{seed:Math.floor(Math.random()*1e6),steps:s?a:n.steps,cfg:1,sampler_name:`euler`,scheduler:`simple`,denoise:s?i:1,model:[`30`,0],positive:[`35`,0],negative:[`33`,0],latent_image:s?[`42`,0]:[`27`,0]},class_type:`KSampler`,_meta:{title:`KSampler`}},33:{inputs:{text:t,clip:[`30`,1]},class_type:`CLIPTextEncode`,_meta:{title:`CLIP Text Encode (Negative Prompt)`}},35:{inputs:{guidance:s?o:3.5,conditioning:[`6`,0]},class_type:`FluxGuidance`,_meta:{title:`FluxGuidance`}},40:{inputs:{filename_prefix:`ComfyUI`,images:[`8`,0]},class_type:`SaveImage`,_meta:{title:`Save Image`}}};return s&&(delete c[27],c[41]={inputs:{image:r,upload:`image`},class_type:`LoadImage`,_meta:{title:`Load Reference Image`}},c[42]={inputs:{pixels:[`41`,0],vae:[`30`,2]},class_type:`VAEEncode`,_meta:{title:`VAE Encode Reference`}}),c}async function p(n,r){let i=await fetch(`/api/generate-gpt-image`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({referenceBase64:n,prompt:r})}),a=await e(i);if(!i.ok)throw Error(t(a,`GPT-IMAGE error: ${i.status}`));if(!a?.imageUrl)throw Error(`No image in response`);return a.imageUrl}var m=`
  You are a professional prompt engineer for image generation.
  Your only task is to transform the user's scene description into a clear, high-quality English image prompt.
  Preserve the exact meaning, intent, action, setting, mood, and story situation from the original description.
  Do not add a new story, new characters, new objects, or important details that were not implied by the user.
  Do not describe the reference character identity; that will be handled by a separate prompt.
  Make the action visually explicit and natural: include pose, gaze direction, body language, interaction with the environment, camera angle, and composition when relevant.
  If the user describes an interaction with another person or group, make that interaction concrete and visible in the scene. The other participant must be close enough to interact, facing or responding to the main character, not only distant background figures.
  If the user describes asking, talking, showing, giving, receiving, helping, following, arguing, or any other interpersonal action, preserve that action as the central visual event.
  If the user's description is in another language, translate it into natural English.
  Return only the improved English scene description, nothing else.
`,h=`
  blurry, bad anatomy, bad hands, ugly, low quality, worst quality, low resolution, watermark,
  signature, extra fingers, missing fingers, bad hands, deformed hands, mutated hands, extra limbs
`,g=`
  You are a professional visual storyteller, storyboard artist, and image editor. You are given a reference image containing an existing character. Your task is to create the next sequential story frame based on the scene description below.

  Primary objective: preserve the character identity one-to-one. Do not create a new character. Do not redesign, reinterpret, stylize differently, or replace the character.

  Preserve all stable character traits from the reference image:
  - face structure, facial features, eye shape, eye color, eyebrows, nose, lips, smile or characteristic expression details;
  - head shape, apparent age, gender presentation, body type, height impression, body proportions, posture language, and silhouette;
  - skin tone, skin details, makeup, freckles, moles, scars, or any other recognizable marks;
  - hairstyle, hair length, hair color, parting, volume, styling, and distinctive hair strands;
  - clothing, clothing color, cut, fabric, pattern, print, collar, sleeves, fit, seams, buttons, and all visible garment details;
  - shoes, jewelry, glasses, bag, hat, accessories, and any objects the character is holding;
  - the exact visual medium and style of the reference image, including whether it is realistic photography, semi-realistic illustration, painted art, anime, manga, webtoon, 3D render, or any other style;
  - level of realism, rendering technique, line quality or absence of line art, texture, color palette, lighting style, camera/lens feel, depth of field, grain, and atmosphere of the reference image.

  Style preservation is mandatory. If the reference image is realistic or photographic, the output must remain realistic or photographic. Do not convert a realistic reference into a cartoon, drawing, manga, webtoon, caricature, sketch, or stylized comic-book illustration unless the scene description explicitly asks for that style change.

  Do not change the character's clothing, accessories, held objects, hairstyle, age, body type, art style, or appearance unless the scene description explicitly requires it. Do not add new important character attributes without a clear reason. Do not remove existing important attributes unless the scene description requires it.

  Be creative only with the new situation: pose, action, environment, composition, camera angle, background, emotion, and story moment. The character must naturally perform the action described in the scene, not merely pose for the camera. If the scene describes an action, show that action through body posture, gaze direction, gesture, interaction with the environment, and panel composition.

  If the scene description includes interaction with another person or group, the interaction must be clearly visible and central to the frame. Place at least one relevant secondary person close enough to interact with the character. Show mutual attention through gaze direction, body orientation, gesture, conversation posture, exchanged object, or response. Do not reduce required interaction partners to distant background silhouettes.

  Avoid a static portrait if the description requires action. Do not mechanically copy the pose from the reference image. You may change pose, gesture, gaze direction, facial expression, body position, and camera angle only as much as needed to accurately depict the new scene.

  Create the image as the next frame in a visual story sequence: a coherent scene, clear action, expressive composition. The environment, background, weather, interior, objects, and scene details must match the description and strengthen the story moment. Do not add random details that contradict the description or distract from the intended situation.

  Scene description for the next story frame:
`,_={width:1024,height:1024,steps:25},v=document.querySelector(`#app`),y={loading:!1,error:null,imageUrl:null,improvedPrompt:null,progress:null,mode:`dalle`,referenceImage:null},b=null,x=0;function S(){let e=y.progress===null?0:Math.min(100,Math.round(y.progress));v.innerHTML=`
    <div class="container">
      <section class="panel panel-left">
        <h1>AI Scene Generator by Reference</h1>

        <div class="mode-select">
          <label>Метод генерации</label>
          <div class="mode-cards">
            <div class="mode-card ${y.mode===`dalle`?`active`:``}" data-mode="dalle">
              <div class="mode-title">GPT Image</div>
              <div class="mode-desc">Редактирует сцену по референсу и описанию.</div>
            </div>
            <div class="mode-card ${y.mode===`sdxl`?`active`:``}" data-mode="sdxl">
              <div class="mode-title">ComfyUI + FLUX.1</div>
              <div class="mode-desc">Генерация через RunPod ComfyUI workflow.</div>
            </div>
          </div>
        </div>

        <div class="form">
          <div class="upload-area" id="upload-area">
            <input type="file" id="reference-input" accept="image/*" style="display:none" />
            ${y.referenceImage?`
              <img src="${y.referenceImage}" alt="Reference" class="reference-preview" />
              <span class="upload-hint">Нажми, чтобы заменить референс</span>
            `:`
              <div class="upload-icon">+</div>
              <span>Загрузи референс персонажа</span>
              <span class="upload-hint">PNG, JPG до 10MB</span>
            `}
          </div>

          <textarea
            id="description"
            placeholder="Опиши следующую сцену..."
            rows="5"
            ${y.loading?`disabled`:``}
          ></textarea>

          <button id="generate" ${y.loading?`disabled`:``}>
            ${y.loading?`Генерация...`:`Генерировать`}
          </button>
        </div>

        ${y.improvedPrompt?`
          <div class="improved-prompt">
            <label>Улучшенный промпт</label>
            <p>${y.improvedPrompt}</p>
          </div>
        `:``}

        ${y.error?`
          <div class="error">${y.error}</div>
        `:``}
      </section>

      <section class="panel panel-right">
        <div class="preview-stage">
          ${y.loading?`
            <div class="loader-state">
              <div class="spinner"></div>
              <div class="progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${e}%"></div>
                </div>
                <p>Генерация изображения... ${e}%</p>
              </div>
            </div>
          `:y.imageUrl?`
            <img src="${y.imageUrl}" alt="Generated image" class="generated-image" />
          `:`
            <div class="empty-result">
              <span>Generated scene will appear here</span>
            </div>
          `}
        </div>

        ${y.imageUrl&&!y.loading?`
          <a class="download-button" href="${y.imageUrl}" download="scene.png">Скачать</a>
        `:``}
      </section>
    </div>
  `,document.querySelectorAll(`.mode-card`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.mode;D(),w({mode:t,loading:!1,imageUrl:null,error:null,improvedPrompt:null,progress:null})})}),document.querySelector(`#generate`)?.addEventListener(`click`,C);let t=document.querySelector(`#upload-area`),n=document.querySelector(`#reference-input`);t?.addEventListener(`click`,()=>n?.click()),n?.addEventListener(`change`,e=>{let t=e.target.files?.[0];if(!t)return;let n=new FileReader;n.onload=e=>{w({referenceImage:e.target?.result})},n.readAsDataURL(t)})}async function C(){let e=++x,t=document.querySelector(`#description`)?.value.trim();if(t){if(y.mode===`dalle`&&!y.referenceImage){w({error:`Загрузи референс персонажа для этого режима`});return}w({loading:!0,error:null,imageUrl:null,improvedPrompt:null,progress:0}),T(e);try{let r=await n(t,m);if(!O(e))return;let i=`${g}
${r}`;if(w({improvedPrompt:i,progress:k(18)}),y.mode===`sdxl`){let t=await s(i,h,_,y.referenceImage||null,(t,n)=>{O(e)&&w({progress:k(18+Math.round(t/n*77))})});if(!O(e))return;E(e),w({loading:!1,imageUrl:t})}else{let t=await p(y.referenceImage,i);if(!O(e))return;E(e),w({loading:!1,imageUrl:t})}}catch(t){if(!O(e))return;E(e),w({loading:!1,error:t instanceof Error?t.message:`Что-то пошло не так`})}}}function w(e){y={...y,...e},S()}function T(e){E(),b=window.setInterval(()=>{if(!O(e)||!y.loading){E(e);return}let t=y.progress??0;t>=95||w({progress:k(Math.min(95,t+(t<35?4:t<70?2:1)))})},900)}function E(e){e!==void 0&&!O(e)||b!==null&&(window.clearInterval(b),b=null)}function D(){x++,E()}function O(e){return e===x}function k(e){return Math.max(y.progress??0,Math.min(100,e))}S();