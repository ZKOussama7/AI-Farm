import random as rd
import torch
from PIL import Image
from tqdm.auto import tqdm
import numpy as np
from datasets import load_dataset,load_metric,DatasetDict,Dataset
from datasets import Image as DImage
from transformers import ViTFeatureExtractor, ViTForImageClassification, TrainingArguments, Trainer, integrations
import os 


device = "cuda" if torch.cuda.is_available() else "cpu"
 model_path="./vit-aifarm1/checkpoint-1000"

extractor = ViTFeatureExtractor.from_pretrained(model_path)
model = ViTForImageClassification.from_pretrained(model_path).to(device)
labels=[i for i in model.config.label2id]

def process_sample(img):
    inputs = extractor(img.convert('RGB'), return_tensors="pt")['pixel_values'].to(device)
    return inputs
def predict(img,top:int=1):
    tg = process_sample(img)
    out = model(tg).logits.cpu()
    id2label = model.config.id2label
    if top == 0 :
        return id2label[int(out.argmax())]
    else:
        vals, idxs =torch.topk(out.softmax(dim=1),k=5)
        vals=vals.squeeze().tolist()
        idxs=idxs.squeeze().tolist()
        for i in range(len(idxs)):
            idxs[i]=id2label[idxs[i]]
        return dict(zip(idxs,vals))

def predictfor(path):
    ig = Image.open(path).resize((500,500))
    return predict(ig,0)

while (1):
    inp = input().split('|')
    # print(inp)
    out=[]
    for i in inp:
        out.append(predictfor(i))
        # print(out)
    out = "|".join(out)
    print(out,sep='',end='')
