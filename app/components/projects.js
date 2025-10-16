"use client";

import Image from "next/image";
import { projects } from "../data/projects";

export default function Projects() {
  return (
    <section id="portfolio" className="relative ">
      {/* Heading badge */}
      <div className="mx-auto  max-w-4xl px-6 pt-20">
        <div className="flex justify-center">
          <span className="inline-block rounded-lg  px-4 py-1 text-sm tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Portfolio
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className=" divide-y divide-slate-200 max-w-xlg dark:divide-slate-800 rounded-2xl  mx-auto">
          {projects.map((p, i) => (
            <ProjectRow key={p.name} project={p} isFirst={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectRow({ project, isFirst }) {
  return (
    <article
      className={[
        "flex gap-8 p-6 md:grid-cols-[180px_1fr] md:gap-10 md:p-10",
        isFirst ? "rounded-t-2xl" : "",
      ].join(" ")}
    >
      {/* Logo */}
      <div className="flex items-center justify-center">
        <div className="relative w-40 max-w-[180px]">
          <Image
            src={project.logo}
            alt={project.name}
            width={320}
            height={160}
            className="h-auto w-full object-contain grayscale contrast-125"
            priority={isFirst}
          />
        </div>
      </div>

      {/* Details with vertical rule */}
      <div className="relative">
        <div className="absolute -left-5 top-2 bottom-2 hidden w-px bg-black md:block dark:bg-slate-800" />
        <h3 className="">
          {project.name}
        </h3>

        <dl className="mt-3 space-y-2 text-sm leading-relaxed">
          <div className="flex gap-2">
            <dt className="min-w-[90px]">
              Industry:
            </dt>
            <dd className="">
              {project.industry}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="min-w-[90px]">
              Platform:
            </dt>
            <dd className="">
              {project.platform}
            </dd>
          </div>
        </dl>

        <p className="mt-4 ">
          {project.description}
        </p>

        <a
          href={project.link}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-[15px] font-medium text-sky-600 underline underline-offset-4 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          Live Site
        </a>
      </div>
    </article>
  );
}
