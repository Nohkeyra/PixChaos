/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("CRITICAL: Missing API_KEY. Ensure your environment variable is configured.");
    }
    return new GoogleGenAI({ apiKey });
};

export const PROTOCOLS = {
    ARTIST: `You are a hyper-fidelity visual synthesis engine. Generate or transform images with absolute artistic precision. The final output MUST be an image. DO NOT provide text responses, conversational replies, or ask follow-up questions.`,
    EDITOR: `You are a non-destructive image processing engine. Apply adjustments based on user prompts. Enhance existing pixels, do not add new elements. The final output MUST be an image. DO NOT provide text responses, conversational replies, or ask follow-up questions.`,
    DESIGNER: `ROLE: Technical Vector Illustrator.
GOAL: Generate raster images perfectly optimized for auto-tracing into SVG.
VISUAL PROTOCOL: 
- Style: Flat Vector Graphics.
- Coloring: Solid, flat colors only (100% opacity).
- Lighting: NO gradients, NO soft shadows, NO ambient occlusion, NO glow. Use Hard Cel-Shading.
- Lines: Thick, consistent, continuous outlines.
- Background: Pure solid #FFFFFF or #000000.
- Texture: Zero noise, zero grain, zero dithering.
NEGATIVE CONSTRAINTS: No photorealism, no complex 3D, no messy lines.
The output MUST be a complete visual image. DO NOT provide text responses or conversational replies.`,
    TYPOGRAPHER: `You are a specialized typographic art generator. Render text as *visual art pieces*. The output MUST be a complete visual image, not a textual description or a prompt. DO NOT provide text responses, conversational replies, or ask follow-up questions.`,
    INPAINT: `You are a context-aware reconstruction algorithm. Seamlessly inpaint images matching lighting and texture. The final output MUST be an image. DO NOT provide text responses, conversational replies, or ask follow-up questions.`,
    PREVIEW: `You are a rapid visual ideation engine. Generate fast, stylistic previews. The final output MUST be an image. DO NOT provide text responses, conversational replies, or ask follow-up questions.`,
    IMAGE_TRANSFORMER: `ROLE: Preset Execution Engine.
GOAL: Apply specific visual signatures to a subject based on a selected preset.
PROTOCOL: Input will be in format "[Subject] + [Preset Name]". Look up the preset in your database and apply its rules strictly.
PRESET DATABASE:
1. BIOMECHANICAL & SURREAL:
- "Gigeresque Symbiote": Fuse subject with polished obsidian exoskeleton, bioluminescent tubing, wet alien machinery. Style: H.R. Giger.
- "Mycelial Network Corruption": Overtake subject with glowing fungal structures and cordyceps. Atmosphere: Spores, organic decay.
- "Deconstructed Glass Anatomy": Turn subject into a fragmented, translucent colored glass sculpture. Abstract medical diagram.
2. TEMPORAL GLITCH & ANOMALY:
- "VHS Data-Bleed Anomaly": Severe tracking errors, heavy chroma noise, 90s timestamp, glitched hex code.
- "Baroque-Punk Overload": Gold-leaf filigree/marble with exposed cybernetic implants. Chiaroscuro.
3. ESOTERIC & ARCANE:
- "Arcane Sigil Overload": Complex glowing occult geometries and raw magical energy.
- "Neo-Tarot Card Inlay": Holographic tarot card frame, foil accents, circuit patterns.
4. CINEMATIC & MOODY:
- "HDR Cinematic": Exaggerated dynamic range, teal & orange grading, intense local contrast.
- "Moody Grain Authentique": 35mm film grain, desaturated tones, crushed blacks, raw emotional feel.
- "Cyberpunk Noir": Deep shadows, rain-slicked streets, cyan/magenta neon reflections.
- "Candid Raw Lifestyle": Unposed, natural lighting, authentic skin texture, no airbrushing.
- "Editorial Luxury": High-end fashion magazine look, gold/earthy tones.
5. ARTISTIC TRANSFORMATION:
- "Digital Painting": Expressive brushwork, concept art style.
- "Van Gogh Oil Painting": Thick swirling impasto, vibrant emotional colors.
- "Blythe Doll Dream": Oversized glossy eyes, porcelain skin, vintage doll aesthetic.
- "Chibi Anime Burst": Compact body, sparkling eyes, speed lines.
- "Ghibli-esque Anime": Hand-painted watercolor backgrounds, nostalgic atmosphere, cel-shaded subject.
- "Neo-Pop Illustration": Ribbon-like color blocks, no outlines, bold high-contrast palette.
6. SCI-FI & SURREAL:
- "Neon Futuristic Glow": Cyan/magenta lighting, cyberpunk, holographic elements.
- "Retrofuturism": 80s Synthwave, sunset gradients, neon grids, chrome.
- "Synthwave Pop Art": Halftone dots, graphic lighting, bold neon palette (Printed Look).
- "Holographic Shift": Shifting rainbow metallic sheen, scan lines.
- "Glitchy Glam 2026": Iridescent neon, pixel sorting, digital artifacts.
- "Solarized Infrared": Inverted tones, pink/white foliage, darkened sky.
- "Fantasy AR Glow": Floating particles, ethereal light beams, high-fantasy magic.
7. ANALOG & VINTAGE:
- "Retro Film Revival": Warm color cast, milky highlights, soft focus, light leaks.
- "Chromatic Edge Max": Extreme RGB color splitting (aberration) on edges.
RULE: Do not explain the style. Output ONLY the visual image.`,
    STYLE_ROUTER: `ROLE: Visual Style Router.
Analyze the visual DNA of the input image and generate a JSON configuration that routes it to one of three specific application panels:
1. filter_panel: Realistic photography, 3D renders, cinematic scenes, paintings, or complex textures. Focus: Lighting, Lens, Texture.
2. vector_art_panel: Flat illustrations, e-sports mascots, corporate icons, or clean line art. Focus: Flatness, Outlines, Separation.
3. typographic_panel: Graffiti tags, neon signs, calligraphy, or custom lettering. Focus: Stroke Physics, Material.
Output strictly in JSON format following the requested schema. NO conversational text.`,
    PRESET_GENERATOR: `ROLE: Metadata Architect.
GOAL: Analyze a raw image prompt and distill it into a reusable "Style Preset" (Visual DNA).
OUTPUT: JSON containing:
- 'name': Catchy 2-3 word title.
- 'description': Precise 1-sentence summary.
- 'recommended_panel': One of ['flux', 'vector_art_panel', 'filter_panel', 'typographic_panel'].
  * 'vector_art_panel': For flat icons, logos, svg, line art, simple illustrations, die-cut stickers.
  * 'typographic_panel': For text-heavy designs, graffiti, neon signs, calligraphy, font styles.
  * 'filter_panel': For photographic filters, color grading, realistic textures, CCTV, VHS, film looks.
  * 'flux': For general complex generative art, characters, scenes, surrealism (default fallback).
Example Output: { "name": "Neon Noir", "description": "High-contrast cyberpunk cityscape.", "recommended_panel": "filter_panel" }`,
};

export interface ImageGenerationConfig {
    aspectRatio?: string;
    isChaos?: boolean;
    systemInstructionOverride?: string;
    negativePrompt?: string; 
    denoisingInstruction?: string; 
}

const fileToPart = async (file: File | string): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    if (typeof file === 'string') {
        if (file.startsWith('data:')) {
            const parts = file.split(',');
            const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
            const data = parts[1];
            return { inlineData: { mimeType, data } };
        }
        // Fallback or error for non-data URLs if needed
        throw new Error("Invalid image source provided. String must be a base64 data URL.");
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve({
                inlineData: {
                    mimeType: file.type,
                    data: base64Data
                }
            });
        };
        reader.onerror = (e) => reject(e);
    });
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("API Response Error: No candidates returned from the AI model.");

    for (const part of candidate.content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    if (response.text) {
        throw new Error(`API Response Error: AI returned text instead of an image. Message: "${response.text}"`);
    }
    
    throw new Error("API Response Error: No valid image data found.");
};

export const refineImagePrompt = async (prompt: string, useFastModel: boolean = false): Promise<string> => {
    const ai = getAiClient();
    const model = useFastModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
        model: model,
        contents: `Refine this user's image generation prompt to be more vivid, detailed, and artistic. Output ONLY the refined prompt: "${prompt}"`,
    });
    return response.text || prompt;
};

export const generatePresetMetadata = async (prompt: string, useFastModel: boolean = false): Promise<{name: string, description: string, recommended_panel: string}> => {
    const ai = getAiClient();
    const model = useFastModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
        model: model,
        contents: `Generate a preset name, description, and recommended panel for this style prompt: "${prompt}"`,
        config: {
            systemInstruction: PROTOCOLS.PRESET_GENERATOR,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    recommended_panel: { type: Type.STRING, enum: ['flux', 'vector_art_panel', 'filter_panel', 'typographic_panel'] }
                },
                required: ['name', 'description', 'recommended_panel']
            }
        }
    });

    try {
        const json = JSON.parse(response.text || '{}');
        return json as {name: string, description: string, recommended_panel: string};
    } catch (e) {
        return { name: "Custom Preset", description: "User generated style.", recommended_panel: 'flux' };
    }
};

export const generateFluxTextToImage = async (prompt: string, config?: ImageGenerationConfig, useFastModel: boolean = false): Promise<string> => {
    const ai = getAiClient();
    const model = useFastModel ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview'; 
    let finalPrompt = config?.isChaos ? `${prompt}, chaotic maximalism, glitch art style` : prompt;
    
    if (config?.negativePrompt) {
        finalPrompt = `${finalPrompt} --AVOID: ${config.negativePrompt}`;
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: finalPrompt }] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.ARTIST,
            imageConfig: { aspectRatio: config?.aspectRatio || '1:1' }
        }
    });
    return handleApiResponse(response);
};

export const generateFluxImage = async (source: File | string, prompt: string, config?: ImageGenerationConfig, useFastModel: boolean = false): Promise<string> => {
    const ai = getAiClient();
    const model = useFastModel ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview'; 
    const imagePart = await fileToPart(source);
    
    let finalPrompt = prompt;
    if (config?.negativePrompt) {
        finalPrompt = `${finalPrompt} --AVOID: ${config.negativePrompt}`;
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: finalPrompt }, imagePart] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.IMAGE_TRANSFORMER, 
            imageConfig: { aspectRatio: config?.aspectRatio || '1:1' }
        }
    });
    return handleApiResponse(response);
};

export const generateFilteredImage = async (source: File | string, prompt: string, config?: ImageGenerationConfig, useFastModel: boolean = false): Promise<string> => {
    const ai = getAiClient();
    const model = useFastModel ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview'; 
    const imagePart = await fileToPart(source);
    
    let finalPrompt = prompt; 
    if (config?.negativePrompt) {
        finalPrompt = `${finalPrompt} --AVOID: ${config.negativePrompt}`;
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: finalPrompt }, imagePart] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.IMAGE_TRANSFORMER, 
            imageConfig: { aspectRatio: config?.aspectRatio || '1:1' }
        }
    });
    return handleApiResponse(response);
};

export const generateInpaintedImage = async (source: File | string, maskBase64: string, prompt: string, config?: ImageGenerationConfig, useFastModel: boolean = false): Promise<string> => {
    const ai = getAiClient();
    const model = useFastModel ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview'; 
    const imagePart = await fileToPart(source);
    
    // Ensure mask is valid base64
    if (!maskBase64 || !maskBase64.includes(',')) {
        throw new Error("Invalid mask data provided to generator.");
    }

    const maskPart = {
        inlineData: {
            mimeType: 'image/png',
            data: maskBase64.split(',')[1]
        }
    };
    
    let finalPrompt = prompt; 
    if (config?.negativePrompt) {
        finalPrompt = `${finalPrompt} --AVOID: ${config.negativePrompt}`;
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: finalPrompt }, imagePart, maskPart] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.IMAGE_TRANSFORMER, 
            imageConfig: { aspectRatio: config?.aspectRatio || '1:1' } 
        }
    });
    return handleApiResponse(response);
};

export const generateRealtimePreview = async (prompt: string, useFastModel: boolean = false): Promise<string | null> => {
    try {
        const ai = getAiClient();
        const model = useFastModel ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [{ text: prompt }] },
            config: {
                systemInstruction: PROTOCOLS.PREVIEW,
                imageConfig: { aspectRatio: '1:1' }
            }
        });
        return handleApiResponse(response);
    } catch (e) {
        console.error("Preview generation failed:", e);
        return null;
    }
};

export interface RoutedStyle {
    target_panel_id: 'filter_panel' | 'vector_art_panel' | 'typographic_panel';
    preset_data: {
        name: string;
        description: string;
        prompt: string;
    };
}

export const extractStyleFromImage = async (imageFile: File | string, useFastModel: boolean = false): Promise<RoutedStyle> => {
    const ai = getAiClient();
    const imagePart = await fileToPart(imageFile);
    const model = useFastModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: "Analyze the input image and perform style routing. Output the JSON configuration strictly following the schema." }, imagePart] },
        config: {
            systemInstruction: PROTOCOLS.STYLE_ROUTER,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    target_panel_id: { type: Type.STRING, enum: ['filter_panel', 'vector_art_panel', 'typographic_panel'] },
                    preset_data: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            prompt: { type: Type.STRING }
                        },
                        required: ['name', 'description', 'prompt']
                    }
                },
                required: ['target_panel_id', 'preset_data']
            }
        }
    });
    
    try {
        const json = JSON.parse(response.text || '{}');
        return json as RoutedStyle;
    } catch (e) {
        throw new Error("Failed to parse visual DNA routing packet.");
    }
};

export const describeImageForPrompt = async (imageFile: File | string, useFastModel: boolean = false): Promise<string> => {
    const ai = getAiClient();
    const imagePart = await fileToPart(imageFile);
    const model = useFastModel ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: "Describe this image in detail as if providing a prompt for a high-end AI image generator. Focus on the main subject, composition, and key visual elements. Output ONLY the description." }, imagePart] },
    });
    return response.text || "";
};