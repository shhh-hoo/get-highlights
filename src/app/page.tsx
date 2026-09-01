import { ResumeStudio } from "@/components/resume-studio";
import { loadResumeMaster } from "@/lib/resume";

export default function Home() {
  const master = loadResumeMaster();
  return <ResumeStudio master={master} />;
}
