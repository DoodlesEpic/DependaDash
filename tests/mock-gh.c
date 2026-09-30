#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifdef _WIN32
#include <process.h>
#else
#include <unistd.h>
#endif

int main(int argc, char **argv) {
  char url[2048];
  char *args[64];
  const char *base = getenv("MOCK_GH_URL");
  const char *real = getenv("REAL_GH");
  int count = 0;
  int endpoint = 0;
  int i;
  if (!base || !real || argc > 30) return 90;
  args[count++] = (char *)real;
  args[count++] = "api";
  if (argc == 10 && !strcmp(argv[1], "repo") && !strcmp(argv[2], "list") && !strcmp(argv[3], "acme") && !strcmp(argv[4], "--limit") && !strcmp(argv[5], "10000") && !strcmp(argv[6], "--json") && !strcmp(argv[7], "nameWithOwner") && !strcmp(argv[8], "--jq") && !strcmp(argv[9], ".[].nameWithOwner")) {
    snprintf(url, sizeof(url), "%s/repos", base);
    args[count++] = url;
    args[count++] = "--jq";
    args[count++] = ".[].nameWithOwner";
  } else if (argc > 2 && !strcmp(argv[1], "api")) {
    for (i = 2; i < argc; i++) {
      if (!strncmp(argv[i], "/repos/acme/", 12)) {
        snprintf(url, sizeof(url), "%s%s", base, argv[i]);
        args[count++] = url;
        endpoint = 1;
      } else args[count++] = argv[i];
    }
    if (!endpoint) return 95;
  } else {
    fprintf(stderr, "Unexpected gh arguments\n");
    return 93;
  }
  args[count] = NULL;
#ifdef _WIN32
  for (i = 0; i < count; i++) {
    const char *source = args[i];
    char *quoted = malloc(strlen(source) * 2 + 3);
    char *target = quoted;
    *target++ = '"';
    while (*source) {
      if (*source == '"') *target++ = '\\';
      *target++ = *source++;
    }
    *target++ = '"';
    *target = 0;
    args[i] = quoted;
  }
  return _spawnv(_P_WAIT, real, (const char * const *)args);
#else
  execv(real, args);
  return 94;
#endif
}
