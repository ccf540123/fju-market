const DEFAULT_SCHOOL_SLUG = "fju";

function getEmailDomain(email) {
  if (!email || email.indexOf("@") === -1) {
    return "";
  }

  return email.split("@")[1].toLowerCase();
}

function findSchoolById(schools, schoolId) {
  return (
    schools.find(function (school) {
      return String(school.id) === String(schoolId);
    }) || null
  );
}

function findSchoolBySlug(schools, slug) {
  return (
    schools.find(function (school) {
      return school.slug === slug;
    }) || null
  );
}

function findSchoolByEmail(schools, email) {
  const domain = getEmailDomain(email);

  if (!domain) {
    return null;
  }

  return (
    schools.find(function (school) {
      const domains = school.email_domains || [];
      return domains.indexOf(domain) !== -1;
    }) || null
  );
}

function getSchoolDomains(school) {
  if (!school || !school.email_domains) {
    return [];
  }

  return school.email_domains;
}

function composeSchoolEmail(studentId, domain) {
  return studentId.trim().toLowerCase() + "@" + domain;
}

function isValidStudentId(studentId) {
  const value = studentId.trim();
  return value !== "" && /^[a-zA-Z0-9._-]+$/.test(value);
}

async function loadSchools() {
  const result = await supabaseClient
    .from("schools")
    .select("id, name, slug, email_domains")
    .order("id", { ascending: true });

  if (result.error) {
    console.error(result.error);
    return [];
  }

  return result.data || [];
}

async function ensureProfileSchool(user, schools) {
  if (!user) {
    return null;
  }

  const profileResult = await supabaseClient
    .from("profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) {
    console.error(profileResult.error);
    return null;
  }

  if (profileResult.data && profileResult.data.school_id) {
    return profileResult.data.school_id;
  }

  const school = findSchoolByEmail(schools, user.email);
  if (!school) {
    return profileResult.data ? profileResult.data.school_id : null;
  }

  if (!profileResult.data) {
    const insertResult = await supabaseClient.from("profiles").insert({
      id: user.id,
      school_id: school.id,
    });

    if (insertResult.error) {
      console.error(insertResult.error);
      return null;
    }
  } else {
    const updateResult = await supabaseClient
      .from("profiles")
      .update({
        school_id: school.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateResult.error) {
      console.error(updateResult.error);
      return profileResult.data.school_id;
    }
  }

  return school.id;
}
