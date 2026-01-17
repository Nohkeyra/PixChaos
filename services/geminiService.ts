/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

// Factory to always get the freshest instance
const getAiClient = () => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("CRITICAL: Missing API_KEY. Check system configuration.");
    }
    return new GoogleGenAI({ apiKey });
};

export const PROTOCOLS = {
    ARTIST: `You are the PIXSHOP Synthesis Engine. Transform prompts into raw, high-fidelity urban visuals. Adhere to street-culture aesthetics: grit, neon, and high contrast.`,
    EDITOR: `Role: High-End Neural Retoucher. Apply technical adjustments with photographic precision.`,
    DESIGNER: `Role: Professional Urban Vector Designer. Output crisp, flat illustrations with bold silhouettes and isolated backgrounds.`,
    TYPOGRAPHER: `Role: Master Street Typographer. Render text as high-impact urban assets (stencil, wildstyle, chrome).`,
    IMAGE_TRANSFORMER: `Role: Stylistic Diffusion Core. Infuse the source subject with the target visual DNA.`,
    STYLE_ROUTER: `Analyze visual DNA and route to: 'filter_panel', 'vector_art_panel', or 'typographic_panel'. Output STRICT JSON.`,
    PRESET_GENERATOR: `Analyze prompt and generate urban metadata. Output STRICT JSON.`
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
        const parts = file.split(',');
        const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const data = parts[1];
        return { inlineData: { mimeType, data } };
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve({ inlineData: { mimeType: file.type, data: base64Data } });
        };
        reader.onerror = () => reject(new Error("IO Fault: Image processing aborted."));
    });
};

const handleApiResponse = (response: GenerateContentResponse): string => {
    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("Synthesis Fault: Empty neural buffer.");
    if (candidate.finishReason === 'SAFETY') throw new Error("Synthesis Aborted: Safety breach detected.");

    for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Synthesis Fault: Visual data missing from candidate.");
};

/**
 * Professionalize this urban synthesis prompt into a high-density AI generation directive.
 * Uses gemini-3-flash-preview for fast tasks and gemini-3-pro-preview for complex reasoning.
 */
export const refineImagePrompt = async (prompt: string, isFastAiEnabled?: boolean, useDeepThinking?: boolean): Promise<string> => {
    const ai = getAiClient();
    
    // Selection of model based on Fast AI toggle
    // If Deep Thinking is enabled, we MUST use pro-preview and add thinking config
    const model = useDeepThinking ? 'gemini-3-pro-preview' : (isFastAiEnabled ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview');
    
    // Config must be any to allow 'thinkingConfig' which is experimental
    const config: any = {};
    if (useDeepThinking) {
        config.thinkingConfig = { thinkingBudget: 2048 }; 
    }

    const response = await ai.models.generateContent({
        model,
        contents: `Professionalize this urban synthesis prompt into a high-density AI generation directive: "${prompt}". Focus on lighting, texture, and composition terms.`,
        config
    });
    return response.text || prompt;
};

export const generateFluxTextToImage = async (prompt: string, config?: ImageGenerationConfig): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: `${prompt}${config?.negativePrompt ? ` --avoid ${config.negativePrompt}` : ''}` }] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.ARTIST,
            imageConfig: { aspectRatio: (config?.aspectRatio || '1:1') as any }
        } as any // Cast to any to bypass strict type checking for imageConfig
    });
    return handleApiResponse(response);
};

export const generateFluxImage = async (source: File | string, prompt: string, config?: ImageGenerationConfig): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    const imagePart = await fileToPart(source);
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.IMAGE_TRANSFORMER, 
            imageConfig: { aspectRatio: (config?.aspectRatio || '1:1') as any }
        } as any
    });
    return handleApiResponse(response);
};

export const generateFilteredImage = async (source: File | string, prompt: string, config?: ImageGenerationConfig): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    const imagePart = await fileToPart(source);
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.EDITOR, 
            imageConfig: { aspectRatio: (config?.aspectRatio || '1:1') as any }
        } as any
    });
    return handleApiResponse(response);
};

export const generateInpaintedImage = async (source: File | string, maskBase64: string, prompt: string, config?: ImageGenerationConfig): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    const imagePart = await fileToPart(source);
    const maskPart = { inlineData: { mimeType: 'image/png', data: maskBase64.split(',')[1] } };
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, imagePart, maskPart] },
        config: {
            systemInstruction: config?.systemInstructionOverride || PROTOCOLS.IMAGE_TRANSFORMER, 
            imageConfig: { aspectRatio: (config?.aspectRatio || '1:1') as any } 
        } as any
    });
    return handleApiResponse(response);
};

export interface RoutedStyle {
    target_panel_id: 'filter_panel' | 'vector_art_panel' | 'typographic_panel';
    preset_data: { name: string; description: string; prompt: string; };
}

export const extractStyleFromImage = async (imageFile: File | string): Promise<RoutedStyle> => {
    const ai = getAiClient();
    const imagePart = await fileToPart(imageFile);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: "Extract Visual DNA and route to target module." }, imagePart] },
        config: {
            systemInstruction: PROTOCOLS.STYLE_ROUTER,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    target_panel_id: { type: Type.STRING, enum: ['filter_panel', 'vector_art_panel', 'typographic_panel'] },
                    preset_data: {
                        type: Type.OBJECT,
                        properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, prompt: { type: Type.STRING } },
                        required: ['name', 'description', 'prompt']
                    }
                },
                required: ['target_panel_id', 'preset_data']
            }
        } as any
    });
    return JSON.parse(response.text || '{}');
};

export const describeImageForPrompt = async (imageFile: File | string): Promise<string> => {
    const ai = getAiClient();
    const imagePart = await fileToPart(imageFile);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: "Describe the core subject and aesthetic of this image for a synthesis prompt." }, imagePart] },
    });
    return response.text || "";
};

export const generatePresetMetadata = async (prompt: string): Promise<{ name: string; description: string; recommended_panel?: string }> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate professional urban metadata for this synthesis prompt: "${prompt}"`,
        config: {
            systemInstruction: PROTOCOLS.PRESET_GENERATOR,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    recommended_panel: { type: Type.STRING, enum: ['flux', 'filter_panel', 'vector_art_panel', 'typographic_panel'] }
                },
                required: ['name', 'description']
            }
        } as any
    });
    return JSON.parse(response.text || '{}');
};

export const generateCinematicKeyframe = async (prompt: string, source?: File | string, config?: { aspectRatio: '16:9' | '9:16' }): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image';
    
    const cinematicPrompt = `Cinematic film still, high budget production value, 8k, anamorphic lens flare, professional color grading. ${prompt}`;
    
    let contents: any = { parts: [{ text: cinematicPrompt }] };
    if (source) {
        const imagePart = await fileToPart(source);
        contents.parts.push(imagePart);
    }

    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction: "Role: Master Cinematographer. Render photorealistic movie keyframes with dramatic lighting, shallow depth of field, and film grain.",
            imageConfig: { aspectRatio: (config?.aspectRatio || '16:9') as any }
        } as any
    });
    return handleApiResponse(response);
};
    
