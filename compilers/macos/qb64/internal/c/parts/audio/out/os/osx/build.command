cd "$(dirname "$0")"
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/common.c -o temp/common.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/control.c -o temp/control.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/dataio.c -o temp/dataio.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/effects.c -o temp/effects.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/filter.c -o temp/filter.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/format.c -o temp/format.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/hio.c -o temp/hio.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/it_load.c -o temp/it_load.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/itsex.c -o temp/itsex.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/lfo.c -o temp/lfo.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/load.c -o temp/load.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/load_helpers.c -o temp/load_helpers.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/md5.c -o temp/md5.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/memio.c -o temp/memio.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/misc.c -o temp/misc.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/mix_all.c -o temp/mix_all.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/mixer.c -o temp/mixer.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/mod_load.c -o temp/mod_load.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/period.c -o temp/period.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/player.c -o temp/player.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/read_event.c -o temp/read_event.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/s3m_load.c -o temp/s3m_load.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/sample.c -o temp/sample.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/scan.c -o temp/scan.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/smix.c -o temp/smix.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/virtual.c -o temp/virtual.o
clang -c -O2 -D LIBXMP_CORE_PLAYER -D LIBXMP_NO_PROWIZARD -D LIBXMP_NO_DEPACKERS -D BUILDING_STATIC ../../extras/libxmp-lite/xm_load.c -o temp/xm_load.o
clang++ -c -std=c++11 -O2 ../../audio.cpp -o temp/audio.o
clang++ -c -std=c++11 -O2 ../../miniaudio_impl.cpp -o temp/miniaudio_impl.o

ar rcs src.a temp/common.o temp/control.o temp/dataio.o temp/effects.o temp/filter.o temp/format.o temp/hio.o temp/it_load.o temp/itsex.o temp/lfo.o temp/load.o temp/load_helpers.o temp/md5.o temp/memio.o temp/misc.o temp/mix_all.o temp/mixer.o temp/mod_load.o temp/period.o temp/player.o temp/read_event.o temp/s3m_load.o temp/sample.o temp/scan.o temp/smix.o temp/virtual.o temp/xm_load.o temp/audio.o temp/miniaudio_impl.o

echo "Press any key to continue..."
Pause()
{
OLDCONFIG=`stty -g`
stty -icanon -echo min 1 time 0
dd count=1 2>/dev/null
stty $OLDCONFIG
}
Pause
echo "Finished! Cancel this shell script or close the terminal"
Pause
Pause
Pause
