"use client";

import Image from "next/image";
import { Projects } from "../data/projects";

export default function Portfolio() {
  return (
    <section id="portfolio" className="relative ">
      <div className="portfolio-track">

      {/* Heading badge */}
      <div className="mx-auto  max-w-4xl px-6 pt-20">
        <div className="flex justify-center">
          <span className="inline-block rounded-lg  px-4 py-1 text-sm tracking-wide text-slate-700 d dark:text-slate-200">
            Portfolio
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className=" max-w-xlg  rounded-2xl  mx-auto">
          {Projects.map((p, i) => (
            <ProjectRow key={p.name} project={p} isFirst={i === 0} />
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}

function ProjectRow({ project, isFirst }) {
  return (
    <article
      className={[
        "item flex gap-8 p-6 md:grid-cols-[180px_1fr] md:gap-15 md:p-10",
        isFirst ? "item rounded-t-2xl" : "",
      ].join(" ")}
    >
      {/* Logo */}
      <div className="flex items-center justify-center">
        <div className="relative w-40 max-w-[100px]">
          <Image
            src={project.logo}
            alt={project.name}
            width={200}
            height={50}
            className="h-auto w-full object-contain grayscale contrast-125"
            priority={isFirst}
          />
        </div>
      </div>
        <div className=" hidden w-px bg-[#DCDCDC] md:block dark:bg-slate-800" />

      {/* Details with vertical rule */}
      <div className="relative">
        <dl className="mt-3 space-y-2 text-sm leading-relaxed">
          <div className="flex gap-2">
            <dt className="min-w-[90px]">
              Brand: 
            </dt>
            <dd className="">
              {project.name}
            </dd>
          </div>
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

        <p className="mt-4 text-sm">
          {project.description}
        </p>

        <a
          href={project.link}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-[13px] text-sm underline underline-offset-4"
        >
          Live Site
        </a>
      </div>
    </article>
  );
}
